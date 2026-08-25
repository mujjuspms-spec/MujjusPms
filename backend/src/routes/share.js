import { Router } from 'express';
import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../lib/auth.js';
import { isAdmin } from '../lib/permissions.js';
import { getWorkspaceSettings } from '../lib/workspaceSettings.js';
import { logAudit } from '../lib/audit.js';
import { projectOut, taskOut } from '../lib/serialize.js';

const router = Router();

async function requireProjectAdmin(req, res, next) {
  const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (!(await isAdmin(req.user, project.workspaceId))) return res.status(403).json({ error: 'Admin access required' });
  req.project = project;
  next();
}

router.post('/:projectId/enable', requireAuth, requireProjectAdmin, async (req, res) => {
  const settings = await getWorkspaceSettings(req.project.workspaceId);
  if (settings && !settings.allowExternalSharing) {
    return res.status(403).json({ error: 'External sharing is disabled for this workspace' });
  }
  const token = crypto.randomBytes(16).toString('hex');
  const { expiresInDays = null } = req.body;
  const expiresAt = expiresInDays ? new Date(Date.now() + Number(expiresInDays) * 86400000) : null;
  const project = await prisma.project.update({
    where: { id: req.params.projectId }, data: { publicShareToken: token, publicShareExpiresAt: expiresAt },
  });
  await logAudit(req.user.id, 'enable_share', 'project', project.id, { expiresInDays }, project.workspaceId);
  res.json({ token, expiresAt });
});

router.post('/:projectId/disable', requireAuth, requireProjectAdmin, async (req, res) => {
  const project = await prisma.project.update({ where: { id: req.params.projectId }, data: { publicShareToken: null, publicShareExpiresAt: null } });
  await logAudit(req.user.id, 'disable_share', 'project', project.id, {}, project.workspaceId);
  res.json({ ok: true });
});

// Deliberately outside requireAuth — this is the whole point of a public
// share link. Read-only: no mutation route ever accepts a share token.
router.get('/:token', async (req, res) => {
  const project = await prisma.project.findUnique({ where: { publicShareToken: req.params.token } });
  if (!project) return res.status(404).json({ error: 'This link is invalid or has been revoked' });
  if (project.publicShareExpiresAt && project.publicShareExpiresAt < new Date()) {
    return res.status(410).json({ error: 'This link has expired — ask the project owner for a new one' });
  }
  const tasks = await prisma.task.findMany({ where: { projectId: project.id, parentId: null } });
  res.json({ project: projectOut(project), tasks: tasks.map(taskOut) });
});

export default router;
