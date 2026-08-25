import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../lib/auth.js';
import { accessibleProjectIds, canAccessProject, canModifyProject, requireWorkspaceContext, workspaceIdForProject } from '../lib/permissions.js';
import { logAudit } from '../lib/audit.js';
import { notifyUser } from '../lib/notify.js';
import { broadcast } from '../lib/sse.js';
import { issueOut } from '../lib/serialize.js';

const router = Router();
const SEVERITIES = ['low', 'medium', 'high', 'critical'];
const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

// With projectId: that project's issues. Without: every issue across
// projects this user can access — powers the portfolio-wide Issues page.
router.get('/', requireAuth, requireWorkspaceContext, async (req, res) => {
  if (req.query.projectId) {
    if (!(await canAccessProject(req.user, req.query.projectId))) return res.status(403).json({ error: 'You do not have access to this project' });
    const rows = await prisma.issue.findMany({ where: { projectId: req.query.projectId }, orderBy: { createdAt: 'desc' } });
    return res.json({ issues: rows.map(issueOut) });
  }
  const ids = await accessibleProjectIds(req.user, req.workspaceId);
  const rows = await prisma.issue.findMany({ where: ids === null ? { project: { workspaceId: req.workspaceId } } : { projectId: { in: ids } }, orderBy: { createdAt: 'desc' } });
  res.json({ issues: rows.map(issueOut) });
});

router.post('/', requireAuth, async (req, res) => {
  const { projectId, title, description = '', severity = 'medium', environment = '', assigneeId = null } = req.body;
  if (!projectId || !title?.trim()) return res.status(400).json({ error: 'projectId and title are required' });
  if (!SEVERITIES.includes(severity)) return res.status(400).json({ error: 'Invalid severity' });
  if (!(await canModifyProject(req.user, projectId))) return res.status(403).json({ error: 'Viewers cannot report issues' });

  const issue = await prisma.issue.create({
    data: { projectId, title: title.trim(), description, severity, environment, assigneeId, reporterId: req.user.id },
  });
  await logAudit(req.user.id, 'create', 'issue', issue.id, { title: issue.title, projectId, severity }, await workspaceIdForProject(projectId));
  if (assigneeId && assigneeId !== req.user.id) {
    await notifyUser(assigneeId, { text: `${req.user.name} assigned you an issue: "${issue.title}"`, projectId, icon: 'i-alert-t', color: 'var(--status-critical)' });
  }
  broadcast('issue.created', issueOut(issue));
  res.status(201).json({ issue: issueOut(issue) });
});

router.patch('/:id', requireAuth, async (req, res) => {
  const existing = await prisma.issue.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Issue not found' });
  if (!(await canModifyProject(req.user, existing.projectId))) return res.status(403).json({ error: 'Viewers cannot edit issues' });

  const data = {};
  if ('title' in req.body) data.title = req.body.title;
  if ('description' in req.body) data.description = req.body.description;
  if ('severity' in req.body && SEVERITIES.includes(req.body.severity)) data.severity = req.body.severity;
  if ('environment' in req.body) data.environment = req.body.environment;
  if ('assigneeId' in req.body) data.assigneeId = req.body.assigneeId;
  if ('status' in req.body && STATUSES.includes(req.body.status)) {
    data.status = req.body.status;
    data.resolvedAt = ['resolved', 'closed'].includes(req.body.status) ? new Date() : null;
  }

  const issue = Object.keys(data).length ? await prisma.issue.update({ where: { id: existing.id }, data }) : existing;
  await logAudit(req.user.id, 'update', 'issue', issue.id, data, await workspaceIdForProject(existing.projectId));
  broadcast('issue.updated', issueOut(issue));
  res.json({ issue: issueOut(issue) });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const existing = await prisma.issue.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Issue not found' });
  if (!(await canModifyProject(req.user, existing.projectId))) return res.status(403).json({ error: 'Viewers cannot delete issues' });
  await prisma.issue.delete({ where: { id: existing.id } });
  await logAudit(req.user.id, 'delete', 'issue', existing.id, { title: existing.title }, await workspaceIdForProject(existing.projectId));
  broadcast('issue.deleted', { id: existing.id, project: existing.projectId });
  res.json({ ok: true });
});

export default router;
