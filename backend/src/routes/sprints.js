import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../lib/auth.js';
import { canAccessProject, canModifyProject, workspaceIdForProject } from '../lib/permissions.js';
import { logAudit } from '../lib/audit.js';
import { sprintOut } from '../lib/serialize.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  if (!req.query.projectId) return res.status(400).json({ error: 'projectId is required' });
  if (!(await canAccessProject(req.user, req.query.projectId))) return res.status(403).json({ error: 'You do not have access to this project' });
  const rows = await prisma.sprint.findMany({ where: { projectId: req.query.projectId }, orderBy: { startDate: 'asc' } });
  res.json({ sprints: rows.map(sprintOut) });
});

router.post('/', requireAuth, async (req, res) => {
  const { projectId, name, startDate, endDate, goal = '' } = req.body;
  if (!projectId || !name?.trim() || !startDate || !endDate) {
    return res.status(400).json({ error: 'projectId, name, startDate and endDate are required' });
  }
  if (!(await canModifyProject(req.user, projectId))) return res.status(403).json({ error: 'Viewers cannot create sprints' });
  const sprint = await prisma.sprint.create({ data: { projectId, name: name.trim(), startDate, endDate, goal } });
  await logAudit(req.user.id, 'create', 'sprint', sprint.id, { name: sprint.name, projectId }, await workspaceIdForProject(projectId));
  res.json({ sprint: sprintOut(sprint) });
});

router.patch('/:id', requireAuth, async (req, res) => {
  const existing = await prisma.sprint.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Sprint not found' });
  if (!(await canModifyProject(req.user, existing.projectId))) return res.status(403).json({ error: 'Viewers cannot edit sprints' });
  const data = {};
  for (const k of ['name', 'startDate', 'endDate', 'goal']) if (k in req.body) data[k] = req.body[k];
  const sprint = Object.keys(data).length ? await prisma.sprint.update({ where: { id: existing.id }, data }) : existing;
  res.json({ sprint: sprintOut(sprint) });
});

// Completed-vs-committed per sprint, oldest first — the raw material for a
// velocity chart. Uses live task state (not history), since velocity is
// normally reported as of now, unlike burndown which needs a time series.
router.get('/velocity', requireAuth, async (req, res) => {
  if (!req.query.projectId) return res.status(400).json({ error: 'projectId is required' });
  if (!(await canAccessProject(req.user, req.query.projectId))) return res.status(403).json({ error: 'You do not have access to this project' });
  const sprints = await prisma.sprint.findMany({ where: { projectId: req.query.projectId }, orderBy: { startDate: 'asc' } });
  const out = [];
  for (const sprint of sprints) {
    const tasks = await prisma.task.findMany({ where: { sprintId: sprint.id }, select: { status: true } });
    out.push({ sprintId: sprint.id, name: sprint.name, total: tasks.length, completed: tasks.filter((t) => t.status === 'done').length });
  }
  res.json({ sprints: out });
});

// Day-by-day remaining-task count across the sprint's date range, reconstructed
// from AuditLog status-change events rather than fabricated — a task counts as
// "burned down" from the first day its status was ever set to done.
router.get('/:id/burndown', requireAuth, async (req, res) => {
  const sprint = await prisma.sprint.findUnique({ where: { id: req.params.id } });
  if (!sprint) return res.status(404).json({ error: 'Sprint not found' });
  if (!(await canAccessProject(req.user, sprint.projectId))) return res.status(403).json({ error: 'You do not have access to this project' });
  const tasks = await prisma.task.findMany({ where: { sprintId: sprint.id }, select: { id: true } });
  const taskIds = tasks.map((t) => t.id);
  const total = taskIds.length;

  const doneDates = {}; // taskId -> earliest Date it was marked done
  if (taskIds.length) {
    const logs = await prisma.auditLog.findMany({
      where: { entityType: 'task', action: 'update', entityId: { in: taskIds } },
      orderBy: { createdAt: 'asc' },
    });
    for (const log of logs) {
      const detail = JSON.parse(log.detailJson || '{}');
      if (detail.field === 'status' && detail.to === 'done' && !doneDates[log.entityId]) {
        doneDates[log.entityId] = log.createdAt;
      }
    }
  }

  // Parsed and incremented in local time throughout (matching how every
  // date in this app round-trips) — never converted through .toISOString(),
  // which would silently shift the displayed day against the server's UTC offset.
  const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const start = new Date(sprint.startDate);
  const end = new Date(sprint.endDate);
  const dayCount = Math.max(1, Math.round((end - start) / 86400000));
  const days = [];
  for (let i = 0; i <= dayCount; i++) {
    const day = new Date(start); day.setDate(day.getDate() + i);
    const remaining = taskIds.filter((id) => !doneDates[id] || doneDates[id] > day).length;
    const ideal = Math.max(0, Math.round(total - (total / dayCount) * i));
    days.push({ date: ymd(day), remaining, ideal });
  }
  res.json({ total, days });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const existing = await prisma.sprint.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Sprint not found' });
  if (!(await canModifyProject(req.user, existing.projectId))) return res.status(403).json({ error: 'Viewers cannot delete sprints' });
  // Un-assign rather than delete the tasks themselves — a sprint is a
  // planning grouping, not an owner of the work.
  await prisma.task.updateMany({ where: { sprintId: existing.id }, data: { sprintId: null } });
  await prisma.sprint.delete({ where: { id: existing.id } });
  await logAudit(req.user.id, 'delete', 'sprint', existing.id, { name: existing.name }, await workspaceIdForProject(existing.projectId));
  res.json({ ok: true });
});

export default router;
