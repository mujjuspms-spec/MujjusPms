import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireApiKey } from '../lib/apiAuth.js';
import { workspaceIdForProject } from '../lib/permissions.js';
import { logAudit } from '../lib/audit.js';
import { dispatchWebhook } from '../lib/webhooks.js';
import { recalcProjectProgress } from '../lib/progress.js';
import { taskOut, projectOut } from '../lib/serialize.js';

// The public REST API — authenticated with an API key (see apiKeys.js /
// apiAuth.js), not the app's JWT session. A deliberately narrower surface
// than the internal routes: read access to the portfolio, plus the task
// actions an external tool is most likely to need (create/update).
const router = Router();
router.use(requireApiKey);

router.get('/projects', async (req, res) => {
  const projects = await prisma.project.findMany();
  res.json({ data: projects.map(projectOut) });
});

router.get('/projects/:id', async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json({ data: projectOut(project) });
});

router.get('/tasks', async (req, res) => {
  const where = req.query.projectId ? { projectId: req.query.projectId } : {};
  const tasks = await prisma.task.findMany({ where });
  res.json({ data: tasks.map(taskOut) });
});

router.get('/tasks/:id', async (req, res) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json({ data: taskOut(task) });
});

router.post('/tasks', async (req, res) => {
  const { project, parentId = null, title, priority = 'medium', assignee = null, start = null, due = 'Unscheduled', status = 'todo' } = req.body;
  if (!project || !title) return res.status(400).json({ error: 'project and title are required' });

  const task = await prisma.task.create({
    data: { projectId: project, parentId, title, status, priority, assigneeId: assignee, start, due, progress: 0, desc: title, createdById: req.user.id },
  });
  await logAudit(req.user.id, 'create', 'task', task.id, { title, project, via: 'public-api' }, await workspaceIdForProject(project));
  if (!parentId) await recalcProjectProgress(project);
  dispatchWebhook('task.created', taskOut(task));
  res.status(201).json({ data: taskOut(task) });
});

router.patch('/tasks/:id', async (req, res) => {
  const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Task not found' });

  const FIELD_MAP = { title: 'title', status: 'status', priority: 'priority', assignee: 'assigneeId', start: 'start', due: 'due', progress: 'progress', desc: 'desc' };
  const data = {};
  for (const [apiKey, dbKey] of Object.entries(FIELD_MAP)) {
    if (apiKey in req.body) data[dbKey] = req.body[apiKey];
  }
  const task = Object.keys(data).length ? await prisma.task.update({ where: { id: existing.id }, data }) : existing;
  await logAudit(req.user.id, 'update', 'task', task.id, { ...data, via: 'public-api' }, await workspaceIdForProject(task.projectId));
  if (!task.parentId && data.status) await recalcProjectProgress(task.projectId);
  dispatchWebhook('task.updated', taskOut(task));
  res.json({ data: taskOut(task) });
});

async function collectDescendantIds(id) {
  const ids = [id];
  const children = await prisma.task.findMany({ where: { parentId: id } });
  for (const c of children) ids.push(...(await collectDescendantIds(c.id)));
  return ids;
}

router.delete('/tasks/:id', async (req, res) => {
  const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Task not found' });

  const ids = await collectDescendantIds(existing.id);
  await prisma.notification.deleteMany({ where: { taskId: { in: ids } } });
  await prisma.attachment.deleteMany({ where: { taskId: { in: ids } } });
  await prisma.comment.deleteMany({ where: { taskId: { in: ids } } });
  await prisma.taskCollaborator.deleteMany({ where: { taskId: { in: ids } } });
  for (const id of [...ids].reverse()) await prisma.task.delete({ where: { id } });

  await logAudit(req.user.id, 'delete', 'task', existing.id, { via: 'public-api', cascaded: ids.length - 1 }, await workspaceIdForProject(existing.projectId));
  if (!existing.parentId) await recalcProjectProgress(existing.projectId);
  dispatchWebhook('task.deleted', { id: existing.id, project: existing.projectId });
  res.json({ ok: true });
});

export default router;
