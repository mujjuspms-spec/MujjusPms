import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../lib/auth.js';
import { accessibleProjectIds, canAccessProject, canCreateTask, canEditTask, projectIdForTask, requireWorkspaceContext, workspaceIdForProject } from '../lib/permissions.js';
import { logAudit } from '../lib/audit.js';
import { runAutomations } from '../lib/automations.js';
import { notifyUser } from '../lib/notify.js';
import { notificationEnabled } from '../lib/workspaceSettings.js';
import { computeCriticalPath, wouldCreateCycle } from '../lib/criticalPath.js';
import { isDueBeforeStart } from '../lib/dates.js';
import { recalcProjectProgress } from '../lib/progress.js';
import { dispatchWebhook } from '../lib/webhooks.js';
import { broadcast } from '../lib/sse.js';
import { taskOut } from '../lib/serialize.js';
import { computeHoursForTasks } from '../lib/hours.js';
import { computeBudgetForTasks, budgetOut } from '../lib/budget.js';
import { parseMoney } from '../lib/money.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

const router = Router();

// A task's own estimated/logged/remaining hours (and, the same way, its
// budget/spent) are simple, but a SUM_OF_SUBTASKS parent's effective
// estimate — and any parent with no budget of its own — depends on its
// descendants, so whenever a subtask is created/edited/deleted, every
// ancestor up to the root (starting with the immediate parent) needs its
// rollup recomputed and re-broadcast, or the parent shown in an
// already-open TaskPanel/Board/List would keep displaying a stale sum.
async function broadcastHourUpdatesFrom(projectId, parentId) {
  if (!parentId) return;
  const projectTasks = await prisma.task.findMany({ where: { projectId } });
  const byId = new Map(projectTasks.map((t) => [t.id, t]));
  const hoursById = await computeHoursForTasks(projectTasks);
  const budgetById = computeBudgetForTasks(projectTasks);

  let current = byId.get(parentId);
  while (current) {
    broadcast('task.updated', taskOut(current, hoursById.get(current.id), budgetById.get(current.id)));
    current = current.parentId ? byId.get(current.parentId) : null;
  }
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatDisplayDate(d) {
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

// When a recurring task is marked done, spins up the next occurrence
// instead of just closing this one out — due date advanced by the rule's
// interval, everything else (assignee, priority, budget) carried forward.
async function cloneRecurringTask(task) {
  const recurrence = JSON.parse(task.recurrenceJson);
  const due = new Date(task.due);
  if (isNaN(due)) return null;
  const next = new Date(due);
  if (recurrence.freq === 'daily') next.setDate(next.getDate() + (recurrence.interval || 1));
  else if (recurrence.freq === 'weekly') next.setDate(next.getDate() + 7 * (recurrence.interval || 1));
  else if (recurrence.freq === 'monthly') next.setMonth(next.getMonth() + (recurrence.interval || 1));
  else return null;
  if (recurrence.endDate && next > new Date(recurrence.endDate)) return null;

  const clone = await prisma.task.create({
    data: {
      projectId: task.projectId, parentId: task.parentId, title: task.title, status: 'todo',
      priority: task.priority, assigneeId: task.assigneeId, due: formatDisplayDate(next),
      progress: 0, desc: task.desc, budget: task.budget, createdById: task.createdById,
      recurrenceJson: task.recurrenceJson,
      estimatedMinutes: task.estimatedMinutes, hourCalculationMode: task.hourCalculationMode,
    },
  });
  if (!clone.parentId) await recalcProjectProgress(clone.projectId);
  broadcast('task.created', taskOut(
    clone,
    { estimatedMinutes: clone.estimatedMinutes, effectiveEstimatedMinutes: clone.estimatedMinutes, hourCalculationMode: clone.hourCalculationMode, loggedMinutes: 0, remainingMinutes: clone.estimatedMinutes },
    budgetOut(clone, clone.budget ?? null, clone.spent ?? null),
  ));
  return clone;
}

router.get('/', requireAuth, requireWorkspaceContext, async (req, res) => {
  const ids = await accessibleProjectIds(req.user, req.workspaceId);
  const tasks = await prisma.task.findMany(ids === null ? { where: { project: { workspaceId: req.workspaceId } } } : { where: { projectId: { in: ids } } });
  // Rollup is computed per-project (a subtask's parent always lives in the
  // same project), so group first rather than rolling up across the whole
  // workspace's tasks together.
  const byProject = new Map();
  for (const t of tasks) {
    if (!byProject.has(t.projectId)) byProject.set(t.projectId, []);
    byProject.get(t.projectId).push(t);
  }
  const hoursById = new Map();
  const budgetById = new Map();
  for (const group of byProject.values()) {
    for (const [id, h] of await computeHoursForTasks(group)) hoursById.set(id, h);
    for (const [id, b] of computeBudgetForTasks(group)) budgetById.set(id, b);
  }
  res.json({ tasks: tasks.map((t) => taskOut(t, hoursById.get(t.id), budgetById.get(t.id))) });
});

router.get('/project/:projectId', requireAuth, async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.projectId }, select: { id: true } });
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (!(await canAccessProject(req.user, project.id))) return res.status(403).json({ error: 'You do not have access to this project' });
  const rows = await prisma.task.findMany({ where: { projectId: req.params.projectId } });
  const hoursById = await computeHoursForTasks(rows);
  const budgetById = computeBudgetForTasks(rows);
  const tasks = rows.map((t) => taskOut(t, hoursById.get(t.id), budgetById.get(t.id)));
  const critical = computeCriticalPath(tasks.filter((t) => !t.parentId));
  res.json({ tasks, criticalPathIds: Array.from(critical) });
});

router.get('/:id', requireAuth, async (req, res) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!(await canAccessProject(req.user, task.projectId))) return res.status(403).json({ error: 'You do not have access to this project' });
  const projectTasks = await prisma.task.findMany({ where: { projectId: task.projectId } });
  const hoursById = await computeHoursForTasks(projectTasks);
  const budgetById = computeBudgetForTasks(projectTasks);
  res.json({ task: taskOut(task, hoursById.get(task.id), budgetById.get(task.id)) });
});

const HOUR_CALC_MODES = ['MANUAL', 'SUM_OF_SUBTASKS'];

function parseEstimatedMinutes(raw) {
  if (raw === null || raw === undefined || raw === '') return { value: null, error: null };
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return { value: null, error: 'Estimated hours must be zero or a positive number' };
  return { value: Math.round(n), error: null };
}

const MAX_TITLE_LENGTH = 500;

router.post('/', requireAuth, async (req, res) => {
  const {
    project, parentId = null, title, priority = 'medium', assignee, start = null, due = 'Unscheduled', status = 'todo',
    dependsOn = [], budget = null, spent = null, recurrence = null, estimatedMinutes, hourCalculationMode,
  } = req.body;
  if (!project || !title) return res.status(400).json({ error: 'project and title are required' });
  if (title.length > MAX_TITLE_LENGTH) return res.status(400).json({ error: `Title must be ${MAX_TITLE_LENGTH} characters or fewer` });
  const parentProject = await prisma.project.findUnique({ where: { id: project }, select: { id: true } });
  if (!parentProject) return res.status(404).json({ error: 'Project not found' });
  const creationCheck = await canCreateTask(req.user, project);
  if (!creationCheck.allowed) return res.status(403).json({ error: creationCheck.reason });
  if (isDueBeforeStart(start, due)) return res.status(400).json({ error: 'Due date cannot be before the start date' });

  if (assignee) {
    const assigneeUser = await prisma.user.findUnique({ where: { id: assignee }, select: { id: true } });
    if (!assigneeUser) return res.status(400).json({ error: 'Assignee not found' });
  }

  const { value: estMinutes, error: estError } = parseEstimatedMinutes(estimatedMinutes);
  if (estError) return res.status(400).json({ error: estError });
  if (hourCalculationMode !== undefined && !HOUR_CALC_MODES.includes(hourCalculationMode)) {
    return res.status(400).json({ error: 'hourCalculationMode must be MANUAL or SUM_OF_SUBTASKS' });
  }
  const { value: budgetVal, error: budgetError } = parseMoney(budget, 'Budget');
  if (budgetError) return res.status(400).json({ error: budgetError });
  const { value: spentVal, error: spentError } = parseMoney(spent, 'Spent');
  if (spentError) return res.status(400).json({ error: spentError });

  const task = await prisma.task.create({
    data: {
      projectId: project, parentId, title, status, priority,
      assigneeId: assignee || req.user.id, start, due, dependsOnJson: JSON.stringify(dependsOn),
      budget: budgetVal, spent: spentVal,
      recurrenceJson: recurrence ? JSON.stringify(recurrence) : null,
      estimatedMinutes: estMinutes, hourCalculationMode: hourCalculationMode || 'MANUAL',
      progress: 0, desc: title, createdById: req.user.id,
    },
  });
  const taskWorkspaceId = await workspaceIdForProject(project);
  await logAudit(req.user.id, 'create', 'task', task.id, { title, project, parentId }, taskWorkspaceId);
  if (task.assigneeId && task.assigneeId !== req.user.id && (await notificationEnabled(taskWorkspaceId, 'taskAssignment'))) {
    await notifyUser(task.assigneeId, { text: `${req.user.name} assigned you "${title}"`, projectId: project, taskId: task.id, icon: 'i-flag', color: 'var(--cat-2)' });
  }
  if (!parentId) await recalcProjectProgress(project);
  const taskWithHours = taskOut(
    task,
    { estimatedMinutes: task.estimatedMinutes, effectiveEstimatedMinutes: task.estimatedMinutes, hourCalculationMode: task.hourCalculationMode, loggedMinutes: 0, remainingMinutes: task.estimatedMinutes },
    budgetOut(task, task.budget ?? null, task.spent ?? null),
  );
  dispatchWebhook('task.created', taskWithHours);
  broadcast('task.created', taskWithHours);
  if (parentId) await broadcastHourUpdatesFrom(project, parentId);
  res.status(201).json({ task: taskWithHours });
});

router.patch('/:id', requireAuth, async (req, res) => {
  const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Task not found' });
  if (!(await canEditTask(req.user, existing.projectId))) return res.status(403).json({ error: 'Viewers cannot edit tasks' });

  const nextStart = 'start' in req.body ? req.body.start : existing.start;
  const nextDue = 'due' in req.body ? req.body.due : existing.due;
  if (('start' in req.body || 'due' in req.body) && isDueBeforeStart(nextStart, nextDue)) {
    return res.status(400).json({ error: 'Due date cannot be before the start date' });
  }

  if (typeof req.body.title === 'string' && req.body.title.length > MAX_TITLE_LENGTH) {
    return res.status(400).json({ error: `Title must be ${MAX_TITLE_LENGTH} characters or fewer` });
  }
  // Not implemented: reparenting isn't in FIELD_MAP below, so silently
  // accepting this field would return 200 while doing nothing — reject
  // instead of lying about success.
  if ('parentId' in req.body) {
    return res.status(400).json({ error: 'Moving a task to a different parent is not supported yet' });
  }

  const FIELD_MAP = { title: 'title', status: 'status', priority: 'priority', assignee: 'assigneeId', start: 'start', due: 'due', progress: 'progress', desc: 'desc', sprintId: 'sprintId' };
  const data = {};
  const changes = [];
  for (const [apiKey, dbKey] of Object.entries(FIELD_MAP)) {
    if (apiKey in req.body && req.body[apiKey] !== existing[dbKey]) {
      changes.push({ field: apiKey, from: existing[dbKey], to: req.body[apiKey] });
      data[dbKey] = req.body[apiKey];
    }
  }
  if (data.assigneeId) {
    const assigneeUser = await prisma.user.findUnique({ where: { id: data.assigneeId }, select: { id: true } });
    if (!assigneeUser) return res.status(400).json({ error: 'Assignee not found' });
  }
  if ('recurrence' in req.body) {
    const newRecurrence = req.body.recurrence ? JSON.stringify(req.body.recurrence) : null;
    if (newRecurrence !== existing.recurrenceJson) {
      changes.push({ field: 'recurrence', from: existing.recurrenceJson, to: newRecurrence });
      data.recurrenceJson = newRecurrence;
    }
  }
  if ('dependsOn' in req.body) {
    const nextDeps = Array.isArray(req.body.dependsOn) ? req.body.dependsOn : [];
    const newDeps = JSON.stringify(nextDeps);
    if (newDeps !== existing.dependsOnJson) {
      if (nextDeps.length > 0) {
        const otherTasks = await prisma.task.findMany({ where: { id: { not: existing.id } }, select: { id: true, dependsOnJson: true } });
        const dependsOnById = new Map(otherTasks.map((t) => [t.id, JSON.parse(t.dependsOnJson || '[]')]));
        if (wouldCreateCycle(dependsOnById, existing.id, nextDeps)) {
          return res.status(400).json({ error: 'A task cannot depend on itself or on a task that depends on it (directly or indirectly)' });
        }
      }
      changes.push({ field: 'dependsOn', from: JSON.parse(existing.dependsOnJson || '[]'), to: nextDeps });
      data.dependsOnJson = newDeps;
    }
  }
  for (const [numKey, label] of [['budget', 'Budget'], ['spent', 'Spent']]) {
    if (numKey in req.body) {
      const { value: next, error } = parseMoney(req.body[numKey], label);
      if (error) return res.status(400).json({ error });
      if (next !== existing[numKey]) {
        changes.push({ field: numKey, from: existing[numKey], to: next });
        data[numKey] = next;
      }
    }
  }
  if ('estimatedMinutes' in req.body) {
    const { value: next, error } = parseEstimatedMinutes(req.body.estimatedMinutes);
    if (error) return res.status(400).json({ error });
    if (next !== existing.estimatedMinutes) {
      changes.push({ field: 'estimatedMinutes', from: existing.estimatedMinutes, to: next });
      data.estimatedMinutes = next;
    }
  }
  if ('hourCalculationMode' in req.body) {
    if (!HOUR_CALC_MODES.includes(req.body.hourCalculationMode)) {
      return res.status(400).json({ error: 'hourCalculationMode must be MANUAL or SUM_OF_SUBTASKS' });
    }
    if (req.body.hourCalculationMode !== existing.hourCalculationMode) {
      changes.push({ field: 'hourCalculationMode', from: existing.hourCalculationMode, to: req.body.hourCalculationMode });
      data.hourCalculationMode = req.body.hourCalculationMode;
    }
  }
  if (req.body.status === 'done') {
    data.progress = 100;
  } else if ('status' in req.body && existing.status === 'done' && existing.progress === 100 && !('progress' in req.body)) {
    // Moving a task off Done shouldn't leave it silently still claiming 100%
    // — that's the mirror image of the rule above, which only pushes
    // progress up when a task first becomes Done. Skipped when the caller
    // is also setting an explicit progress value in this same request.
    changes.push({ field: 'progress', from: existing.progress, to: 0 });
    data.progress = 0;
  }

  const task = Object.keys(data).length ? await prisma.task.update({ where: { id: existing.id }, data }) : existing;

  const taskWorkspaceId = await workspaceIdForProject(task.projectId);
  for (const change of changes) {
    await logAudit(req.user.id, 'update', 'task', task.id, change, taskWorkspaceId);
    if (change.field === 'status' || change.field === 'spent' || change.field === 'budget') await runAutomations(task, change);
  }
  if (changes.some((c) => c.field === 'assignee') && task.assigneeId && (await notificationEnabled(taskWorkspaceId, 'taskAssignment'))) {
    await notifyUser(task.assigneeId, { text: `${req.user.name} assigned you "${task.title}"`, projectId: task.projectId, taskId: task.id, icon: 'i-flag', color: 'var(--cat-2)' });
  }
  // Only a top-level task's own status feeds the project's progress — it
  // isn't auto-derived from its subtasks.
  if (!task.parentId && changes.some((c) => c.field === 'status')) await recalcProjectProgress(task.projectId);

  const projectTasksForHours = await prisma.task.findMany({ where: { projectId: task.projectId } });
  const hoursById = await computeHoursForTasks(projectTasksForHours);
  const budgetById = computeBudgetForTasks(projectTasksForHours);
  const taskWithHours = taskOut(task, hoursById.get(task.id), budgetById.get(task.id));

  if (changes.length) {
    dispatchWebhook('task.updated', taskWithHours);
    broadcast('task.updated', taskWithHours);
  }
  if (task.parentId && changes.some((c) => ['estimatedMinutes', 'hourCalculationMode', 'budget', 'spent'].includes(c.field))) {
    await broadcastHourUpdatesFrom(task.projectId, task.parentId);
  }

  let nextOccurrence = null;
  if (task.recurrenceJson && changes.some((c) => c.field === 'status' && c.to === 'done')) {
    nextOccurrence = await cloneRecurringTask(task);
  }

  res.json({ task: taskWithHours, nextOccurrence: nextOccurrence ? taskOut(nextOccurrence) : undefined });
});

router.post('/:id/move', requireAuth, async (req, res) => {
  const { direction } = req.body; // 'left' | 'right'
  const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Task not found' });
  if (!(await canEditTask(req.user, existing.projectId))) return res.status(403).json({ error: 'Viewers cannot move tasks' });

  const neighbor = await prisma.task.findFirst({
    where: {
      projectId: existing.projectId, parentId: existing.parentId,
      order: direction === 'left' ? { lt: existing.order } : { gt: existing.order },
    },
    orderBy: { order: direction === 'left' ? 'desc' : 'asc' },
  });
  if (neighbor) {
    await prisma.$transaction([
      prisma.task.update({ where: { id: existing.id }, data: { order: neighbor.order } }),
      prisma.task.update({ where: { id: neighbor.id }, data: { order: existing.order } }),
    ]);
  }
  res.json({ ok: true });
});

async function collectDescendantIds(id) {
  const ids = [id];
  const children = await prisma.task.findMany({ where: { parentId: id } });
  for (const c of children) ids.push(...(await collectDescendantIds(c.id)));
  return ids;
}

router.delete('/:id', requireAuth, async (req, res) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!(await canEditTask(req.user, task.projectId))) return res.status(403).json({ error: 'Viewers cannot delete tasks' });

  const ids = await collectDescendantIds(task.id);
  const attachments = await prisma.attachment.findMany({ where: { taskId: { in: ids } } });

  await prisma.notification.deleteMany({ where: { taskId: { in: ids } } });
  await prisma.attachment.deleteMany({ where: { taskId: { in: ids } } });
  await prisma.comment.deleteMany({ where: { taskId: { in: ids } } });
  await prisma.taskCollaborator.deleteMany({ where: { taskId: { in: ids } } });
  // Reversing the (parent-first) collection order guarantees every child is
  // deleted before its parent, satisfying the self-referential FK.
  for (const id of [...ids].reverse()) {
    await prisma.task.delete({ where: { id } });
  }
  for (const a of attachments) {
    try { fs.unlinkSync(path.join(UPLOAD_DIR, a.storedName)); } catch { /* already gone */ }
  }

  await logAudit(req.user.id, 'delete', 'task', task.id, { cascaded: ids.length - 1 }, await workspaceIdForProject(task.projectId));
  if (!task.parentId) await recalcProjectProgress(task.projectId);
  dispatchWebhook('task.deleted', { id: task.id, project: task.projectId });
  broadcast('task.deleted', { id: task.id, deletedIds: ids, project: task.projectId });
  if (task.parentId) await broadcastHourUpdatesFrom(task.projectId, task.parentId);
  res.json({ deletedIds: ids });
});

// Extra people on a task/subtask beyond its single primary assignee — lets
// a task have multiple assignees without touching anything else (Board,
// Workload, Gantt, …) that keys off the primary `assignee` field.
router.get('/:id/collaborators', requireAuth, async (req, res) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.id }, select: { projectId: true } });
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!(await canAccessProject(req.user, task.projectId))) return res.status(403).json({ error: 'You do not have access to this project' });
  const rows = await prisma.taskCollaborator.findMany({ where: { taskId: req.params.id } });
  res.json({ collaborators: rows.map((r) => r.userId) });
});

router.post('/:id/collaborators', requireAuth, async (req, res) => {
  const { personId } = req.body;
  const task = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!personId) return res.status(400).json({ error: 'personId is required' });
  if (!(await canEditTask(req.user, task.projectId))) return res.status(403).json({ error: 'Viewers cannot modify task collaborators' });
  if (personId === task.assigneeId) return res.status(400).json({ error: 'This person is already the primary assignee on this task' });

  await prisma.taskCollaborator.upsert({
    where: { taskId_userId: { taskId: task.id, userId: personId } },
    update: {}, create: { taskId: task.id, userId: personId },
  });
  await logAudit(req.user.id, 'add_collaborator', 'task', task.id, { personId }, await workspaceIdForProject(task.projectId));
  if (personId !== req.user.id) {
    await notifyUser(personId, { text: `${req.user.name} added you to "${task.title}"`, projectId: task.projectId, taskId: task.id, icon: 'i-flag', color: 'var(--cat-2)' });
  }

  const rows = await prisma.taskCollaborator.findMany({ where: { taskId: task.id } });
  res.json({ collaborators: rows.map((r) => r.userId) });
});

router.delete('/:id/collaborators/:userId', requireAuth, async (req, res) => {
  const projectId = await projectIdForTask(req.params.id);
  if (!projectId) return res.status(404).json({ error: 'Task not found' });
  if (!(await canEditTask(req.user, projectId))) return res.status(403).json({ error: 'Viewers cannot modify task collaborators' });
  await prisma.taskCollaborator.deleteMany({ where: { taskId: req.params.id, userId: req.params.userId } });
  await logAudit(req.user.id, 'remove_collaborator', 'task', req.params.id, { personId: req.params.userId }, await workspaceIdForProject(projectId));
  const rows = await prisma.taskCollaborator.findMany({ where: { taskId: req.params.id } });
  res.json({ collaborators: rows.map((r) => r.userId) });
});

export default router;
