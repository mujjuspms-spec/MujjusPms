import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../lib/auth.js';
import { requireWorkspaceContext, requireWorkspaceRole } from '../lib/permissions.js';
import { logAudit } from '../lib/audit.js';
import { ruleOut } from '../lib/serialize.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const rules = await prisma.automationRule.findMany();
  res.json({ rules: rules.map(ruleOut) });
});

router.post('/', requireAuth, requireWorkspaceContext, requireWorkspaceRole('MEMBER'), async (req, res) => {
  const { name, projectId = null, triggerType, triggerConfig = {}, actionType, actionConfig = {} } = req.body;
  if (!name || !triggerType || !actionType) return res.status(400).json({ error: 'name, triggerType, actionType are required' });
  const rule = await prisma.automationRule.create({
    data: {
      name, projectId, triggerType, triggerConfigJson: JSON.stringify(triggerConfig),
      actionType, actionConfigJson: JSON.stringify(actionConfig), enabled: true, createdById: req.user.id,
    },
  });
  await logAudit(req.user.id, 'create', 'automation_rule', rule.id, { name }, req.workspaceId);
  res.json({ rule: ruleOut(rule) });
});

router.patch('/:id', requireAuth, requireWorkspaceContext, requireWorkspaceRole('MEMBER'), async (req, res) => {
  const existing = await prisma.automationRule.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Rule not found' });
  const data = {};
  if ('enabled' in req.body) data.enabled = req.body.enabled;
  if ('name' in req.body) data.name = req.body.name;
  const rule = await prisma.automationRule.update({ where: { id: existing.id }, data });
  await logAudit(req.user.id, 'update', 'automation_rule', rule.id, req.body, req.workspaceId);
  res.json({ rule: ruleOut(rule) });
});

router.delete('/:id', requireAuth, requireWorkspaceContext, requireWorkspaceRole('ADMIN'), async (req, res) => {
  await prisma.automationRule.delete({ where: { id: req.params.id } }).catch(() => {});
  await logAudit(req.user.id, 'delete', 'automation_rule', req.params.id, {}, req.workspaceId);
  res.json({ ok: true });
});

export default router;
