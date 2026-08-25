import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/auth.js';
import { logAudit } from '../lib/audit.js';

const router = Router();
const STATE_SECRET = process.env.JWT_SECRET || 'mujuzpm-dev-secret-change-in-prod';

// Real OAuth2 / OpenID Connect "Sign in with Google/Microsoft" — this is
// what "SSO" means in practice for the vast majority of apps (classic SAML
// needs a specific enterprise identity provider to configure against, which
// isn't available here). Each provider's app credentials are supplied by
// the workspace admin via Settings → Integrations, stored the same way as
// the Anthropic/Slack integrations — nothing is hardcoded or shared.
const PROVIDERS = {
  google: {
    integrationKey: 'googleOAuth',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userinfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
    scope: 'openid email profile',
    mapUser: (info) => ({ email: info.email, name: info.name }),
  },
  microsoft: {
    integrationKey: 'microsoftOAuth',
    authorizeUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userinfoUrl: 'https://graph.microsoft.com/oidc/userinfo',
    scope: 'openid email profile',
    mapUser: (info) => ({ email: info.email, name: info.name }),
  },
};

function redirectUri(req, provider) {
  return `${req.protocol}://${req.get('host')}/api/auth/sso/${provider}/callback`;
}

router.get('/status', async (req, res) => {
  const rows = await prisma.integration.findMany({ where: { provider: { in: ['googleOAuth', 'microsoftOAuth'] } } });
  res.json({
    google: !!rows.find((r) => r.provider === 'googleOAuth')?.connected,
    microsoft: !!rows.find((r) => r.provider === 'microsoftOAuth')?.connected,
  });
});

router.get('/:provider/start', async (req, res) => {
  const provider = PROVIDERS[req.params.provider];
  if (!provider) return res.status(404).send('Unknown SSO provider');

  const row = await prisma.integration.findUnique({ where: { provider: provider.integrationKey } });
  const cfg = row?.connected ? JSON.parse(row.configJson || '{}') : null;
  if (!cfg?.clientId) return res.status(400).send('Ask your workspace admin to connect this sign-in method in Settings → Integrations first.');

  const state = jwt.sign({ p: req.params.provider }, STATE_SECRET, { expiresIn: '10m' });
  const url = new URL(provider.authorizeUrl);
  url.searchParams.set('client_id', cfg.clientId);
  url.searchParams.set('redirect_uri', redirectUri(req, req.params.provider));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', provider.scope);
  url.searchParams.set('state', state);
  res.redirect(url.toString());
});

router.get('/:provider/callback', async (req, res) => {
  const providerKey = req.params.provider;
  const provider = PROVIDERS[providerKey];
  if (!provider) return res.status(404).send('Unknown SSO provider');

  const { code, state, error } = req.query;
  if (error) return res.redirect(`/login?ssoError=${encodeURIComponent(error)}`);
  try {
    jwt.verify(state, STATE_SECRET);
  } catch {
    return res.redirect('/login?ssoError=invalid_state');
  }

  const row = await prisma.integration.findUnique({ where: { provider: provider.integrationKey } });
  const cfg = row?.connected ? JSON.parse(row.configJson || '{}') : null;
  if (!cfg?.clientId || !cfg?.clientSecret) return res.redirect('/login?ssoError=not_configured');

  try {
    const tokenRes = await fetch(provider.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: cfg.clientId, client_secret: cfg.clientSecret,
        redirect_uri: redirectUri(req, providerKey), grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) return res.redirect(`/login?ssoError=token_exchange_failed`);
    const tokens = await tokenRes.json();

    const infoRes = await fetch(provider.userinfoUrl, { headers: { Authorization: `Bearer ${tokens.access_token}` } });
    if (!infoRes.ok) return res.redirect('/login?ssoError=userinfo_failed');
    const info = await infoRes.json();
    const { email, name } = provider.mapUser(info);
    if (!email) return res.redirect('/login?ssoError=no_email');

    let user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      const displayName = name || email.split('@')[0];
      user = await prisma.user.create({
        data: {
          id: nanoid(8), name: displayName, email: email.toLowerCase(), role: '', globalRole: 'member',
          color: 'var(--cat-3)', initials: displayName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase(),
          passwordHash: nanoid(32), capacity: 40, allocated: 0,
        },
      });
      await logAudit(user.id, 'register', 'user', user.id, { email: user.email, via: `sso:${providerKey}` });
    }
    await logAudit(user.id, 'login', 'user', user.id, { via: `sso:${providerKey}` });

    res.redirect(`/auth/callback?token=${encodeURIComponent(signToken(user))}`);
  } catch (e) {
    console.error('SSO callback error:', e);
    res.redirect('/login?ssoError=unexpected');
  }
});

export default router;
