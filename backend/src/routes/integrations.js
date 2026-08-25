import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../lib/auth.js';
import { requireWorkspaceContext, requireWorkspaceRole } from '../lib/permissions.js';
import { logAudit } from '../lib/audit.js';
import { integrationOut } from '../lib/serialize.js';

const router = Router();
const PROVIDERS = ['slack', 'googleCalendar', 'googleOAuth', 'microsoftOAuth', 'docusign', 'quickbooks'];
// docusign/quickbooks are intentionally not real yet (no e-signature or
// accounting API calls exist anywhere in this codebase) — the route below
// refuses to mark them "connected" so the UI can't show a working-looking
// toggle for something that doesn't do anything. Remove this restriction
// once a real integration is built.
const COMING_SOON = ['docusign', 'quickbooks'];
const REQUIRED_FIELDS = {
  slack: ['webhookUrl'],
  googleCalendar: ['clientId', 'clientSecret'],
  googleOAuth: ['clientId', 'clientSecret'],
  microsoftOAuth: ['clientId', 'clientSecret'],
  docusign: ['integrationKey', 'clientSecret'],
  quickbooks: ['clientId', 'clientSecret'],
};

router.get('/', requireAuth, async (req, res) => {
  const rows = await prisma.integration.findMany();
  const out = {};
  for (const p of PROVIDERS) {
    const row = rows.find((r) => r.provider === p);
    out[p] = row ? integrationOut(row) : { connected: false };
  }
  res.json({ integrations: out });
});

router.patch('/:provider', requireAuth, requireWorkspaceContext, requireWorkspaceRole('ADMIN'), async (req, res) => {
  const provider = req.params.provider;
  if (!PROVIDERS.includes(provider)) return res.status(404).json({ error: 'Unknown provider' });
  if (COMING_SOON.includes(provider)) return res.status(501).json({ error: 'This integration is not built yet — coming soon.' });
  const existing = await prisma.integration.findUnique({ where: { provider } });
  const currentConfig = existing ? JSON.parse(existing.configJson || '{}') : {};
  const config = { ...currentConfig, ...req.body };
  const connected = REQUIRED_FIELDS[provider].every((f) => !!config[f]);
  const row = await prisma.integration.upsert({
    where: { provider },
    update: { connected, configJson: JSON.stringify(config) },
    create: { provider, connected, configJson: JSON.stringify(config) },
  });
  await logAudit(req.user.id, 'update_integration', 'integration', provider, { connected }, req.workspaceId);
  res.json({ integration: integrationOut(row) });
});

router.post('/slack/test', requireAuth, async (req, res) => {
  const row = await prisma.integration.findUnique({ where: { provider: 'slack' } });
  if (!row?.connected) return res.status(400).json({ error: 'Add a Slack webhook URL in Settings first' });
  const cfg = JSON.parse(row.configJson || '{}');
  try {
    const r = await fetch(cfg.webhookUrl, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `:rocket: MujuzPM test notification from ${req.user.name}` }),
    });
    if (!r.ok) return res.status(502).json({ error: `Slack responded ${r.status}` });
    res.json({ ok: true });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// Real Google Calendar connect: separate from the SSO login flow — this
// requests calendar.events scope and stores the resulting access/refresh
// token on the googleCalendar Integration row, so `sync` below can make
// genuine Calendar API calls instead of just flipping a "Connected" pill.
const CAL_STATE_SECRET = process.env.JWT_SECRET || 'mujuzpm-dev-secret-change-in-prod';

router.get('/googleCalendar/connect', requireAuth, requireWorkspaceContext, requireWorkspaceRole('ADMIN'), async (req, res) => {
  const row = await prisma.integration.findUnique({ where: { provider: 'googleCalendar' } });
  const cfg = row?.connected ? JSON.parse(row.configJson || '{}') : null;
  if (!cfg?.clientId) return res.status(400).json({ error: 'Save a Google OAuth Client ID + Secret above first' });

  const state = jwt.sign({ u: req.user.id }, CAL_STATE_SECRET, { expiresIn: '10m' });
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', cfg.clientId);
  url.searchParams.set('redirect_uri', `${req.protocol}://${req.get('host')}/api/integrations/googleCalendar/callback`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar.events');
  url.searchParams.set('state', state);
  res.json({ url: url.toString() });
});

router.get('/googleCalendar/callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return res.redirect(`/settings/integrations?calendarError=${encodeURIComponent(error)}`);
  try { jwt.verify(state, CAL_STATE_SECRET); } catch { return res.redirect('/settings/integrations?calendarError=invalid_state'); }

  const row = await prisma.integration.findUnique({ where: { provider: 'googleCalendar' } });
  const cfg = row?.connected ? JSON.parse(row.configJson || '{}') : null;
  if (!cfg?.clientId) return res.redirect('/settings/integrations?calendarError=not_configured');

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: cfg.clientId, client_secret: cfg.clientSecret,
        redirect_uri: `${req.protocol}://${req.get('host')}/api/integrations/googleCalendar/callback`,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) return res.redirect('/settings/integrations?calendarError=token_exchange_failed');
    const tokens = await tokenRes.json();

    const nextCfg = {
      ...cfg,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || cfg.refreshToken,
      expiresAt: Date.now() + (tokens.expires_in || 3600) * 1000,
    };
    await prisma.integration.update({ where: { provider: 'googleCalendar' }, data: { configJson: JSON.stringify(nextCfg) } });
    res.redirect('/settings/integrations?calendarConnected=1');
  } catch (e) {
    console.error('Google Calendar callback error:', e);
    res.redirect('/settings/integrations?calendarError=unexpected');
  }
});

async function calendarAccessToken(cfg) {
  if (cfg.accessToken && cfg.expiresAt > Date.now() + 60000) return cfg.accessToken;
  if (!cfg.refreshToken) return null;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: cfg.clientId, client_secret: cfg.clientSecret, refresh_token: cfg.refreshToken, grant_type: 'refresh_token' }),
  });
  if (!r.ok) return null;
  const tokens = await r.json();
  const nextCfg = { ...cfg, accessToken: tokens.access_token, expiresAt: Date.now() + (tokens.expires_in || 3600) * 1000 };
  await prisma.integration.update({ where: { provider: 'googleCalendar' }, data: { configJson: JSON.stringify(nextCfg) } });
  return tokens.access_token;
}

// The one real, working action for this integration: push every project's
// due date to the connected Google Calendar as a real event, via a genuine
// Calendar API call — not a simulated "sync" toggle.
router.post('/googleCalendar/sync', requireAuth, requireWorkspaceContext, requireWorkspaceRole('ADMIN'), async (req, res) => {
  const row = await prisma.integration.findUnique({ where: { provider: 'googleCalendar' } });
  const cfg = row?.connected ? JSON.parse(row.configJson || '{}') : null;
  if (!cfg?.refreshToken) return res.status(400).json({ error: 'Connect your Google account above first' });

  const accessToken = await calendarAccessToken(cfg);
  if (!accessToken) return res.status(502).json({ error: 'Could not refresh Google access token — reconnect your account' });

  const projects = await prisma.project.findMany();
  let synced = 0;
  const errors = [];
  for (const p of projects) {
    const due = new Date(p.due);
    if (isNaN(due)) continue;
    const dateStr = due.toISOString().slice(0, 10);
    try {
      const r = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: `${p.name} — due`,
          description: `MujuzPM project due date · ${p.progress}% complete`,
          start: { date: dateStr }, end: { date: dateStr },
        }),
      });
      if (r.ok) synced++; else errors.push(`${p.name}: ${r.status}`);
    } catch (e) {
      errors.push(`${p.name}: ${e.message}`);
    }
  }
  await logAudit(req.user.id, 'sync', 'integration', 'googleCalendar', { synced, errors: errors.length }, req.workspaceId);
  res.json({ synced, total: projects.length, errors });
});



export default router;
