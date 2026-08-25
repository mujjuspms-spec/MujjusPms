import { Router } from 'express';
import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../lib/auth.js';
import { requireWorkspaceContext, requireWorkspaceRole } from '../lib/permissions.js';
import { logAudit } from '../lib/audit.js';

const router = Router();

export const WEBHOOK_EVENTS = ['task.created', 'task.updated', 'task.deleted', 'project.created'];

function hookOut(h) {
  return { id: h.id, url: h.url, events: JSON.parse(h.eventsJson || '[]'), enabled: h.enabled, createdAt: h.createdAt };
}

router.get('/', requireAuth, requireWorkspaceContext, requireWorkspaceRole('ADMIN'), async (req, res) => {
  const rows = await prisma.webhook.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ webhooks: rows.map(hookOut) });
});

router.post('/', requireAuth, requireWorkspaceContext, requireWorkspaceRole('ADMIN'), async (req, res) => {
  const { url, events = [] } = req.body;
  if (!url?.trim()) return res.status(400).json({ error: 'url is required' });
  const validEvents = events.filter((e) => WEBHOOK_EVENTS.includes(e));
  if (validEvents.length === 0) return res.status(400).json({ error: 'Select at least one event' });

  const secret = crypto.randomBytes(20).toString('hex');
  const hook = await prisma.webhook.create({
    data: { url: url.trim(), eventsJson: JSON.stringify(validEvents), secret, createdById: req.user.id },
  });
  await logAudit(req.user.id, 'create', 'webhook', hook.id, { url: hook.url, events: validEvents }, req.workspaceId);
  // The signing secret is only ever returned here, at creation.
  res.json({ webhook: hookOut(hook), secret });
});

router.patch('/:id', requireAuth, requireWorkspaceContext, requireWorkspaceRole('ADMIN'), async (req, res) => {
  const existing = await prisma.webhook.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Webhook not found' });
  const data = {};
  if ('enabled' in req.body) data.enabled = !!req.body.enabled;
  if ('events' in req.body) data.eventsJson = JSON.stringify(req.body.events.filter((e) => WEBHOOK_EVENTS.includes(e)));
  const hook = Object.keys(data).length ? await prisma.webhook.update({ where: { id: existing.id }, data }) : existing;
  res.json({ webhook: hookOut(hook) });
});

router.delete('/:id', requireAuth, requireWorkspaceContext, requireWorkspaceRole('ADMIN'), async (req, res) => {
  const existing = await prisma.webhook.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Webhook not found' });
  await prisma.webhook.delete({ where: { id: existing.id } });
  await logAudit(req.user.id, 'delete', 'webhook', existing.id, { url: existing.url }, req.workspaceId);
  res.json({ ok: true });
});

export default router;
