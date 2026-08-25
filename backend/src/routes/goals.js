import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../lib/auth.js';
import { accessibleProjectIds, canModifyProject, requireWorkspaceContext, workspaceIdForProject } from '../lib/permissions.js';
import { logAudit } from '../lib/audit.js';
import { goalOut } from '../lib/serialize.js';

const router = Router();

router.get('/', requireAuth, requireWorkspaceContext, async (req, res) => {
  const ids = await accessibleProjectIds(req.user, req.workspaceId);
  const rows = await prisma.goal.findMany({ where: ids === null ? { project: { workspaceId: req.workspaceId } } : { projectId: { in: ids } }, orderBy: { createdAt: 'desc' } });
  res.json({ goals: rows.map(goalOut) });
});

router.post('/', requireAuth, async (req, res) => {
  const { projectId, ownerId, quarter, title, progress = 0 } = req.body;
  if (!projectId || !ownerId || !quarter || !title?.trim()) {
    return res.status(400).json({ error: 'projectId, ownerId, quarter and title are required' });
  }
  if (!(await canModifyProject(req.user, projectId))) return res.status(403).json({ error: 'Viewers cannot create goals' });
  const goal = await prisma.goal.create({
    data: { projectId, ownerId, quarter, title: title.trim(), progress: Number(progress) || 0, createdById: req.user.id },
  });
  await logAudit(req.user.id, 'create', 'goal', goal.id, { title: goal.title, projectId }, await workspaceIdForProject(projectId));
  res.json({ goal: goalOut(goal) });
});

router.patch('/:id', requireAuth, async (req, res) => {
  const existing = await prisma.goal.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Goal not found' });
  if (!(await canModifyProject(req.user, existing.projectId))) return res.status(403).json({ error: 'Viewers cannot edit goals' });

  const data = {};
  if ('title' in req.body) data.title = req.body.title;
  if ('quarter' in req.body) data.quarter = req.body.quarter;
  if ('ownerId' in req.body) data.ownerId = req.body.ownerId;
  if ('progress' in req.body) data.progress = Math.max(0, Math.min(100, Number(req.body.progress) || 0));

  const goal = Object.keys(data).length ? await prisma.goal.update({ where: { id: existing.id }, data }) : existing;
  await logAudit(req.user.id, 'update', 'goal', goal.id, data, await workspaceIdForProject(existing.projectId));
  res.json({ goal: goalOut(goal) });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const existing = await prisma.goal.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Goal not found' });
  if (!(await canModifyProject(req.user, existing.projectId))) return res.status(403).json({ error: 'Viewers cannot delete goals' });
  await prisma.goal.delete({ where: { id: existing.id } });
  await logAudit(req.user.id, 'delete', 'goal', existing.id, { title: existing.title }, await workspaceIdForProject(existing.projectId));
  res.json({ ok: true });
});

export default router;
