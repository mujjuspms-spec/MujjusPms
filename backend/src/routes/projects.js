import { Router } from 'express';
import { nanoid } from 'nanoid';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../lib/auth.js';
import { requireAdmin, canAccessProject, getProjectRole, isAdmin, accessibleProjectIds, requireWorkspaceContext } from '../lib/permissions.js';
import { logAudit } from '../lib/audit.js';
import { notifyUser } from '../lib/notify.js';
import { broadcast } from '../lib/sse.js';
import { projectOut } from '../lib/serialize.js';
import { computeProjectBudgetTotals } from '../lib/budget.js';
import { parseMoney } from '../lib/money.js';
import { getAnyTemplate } from '../lib/roadmapTemplates.js';
import { applyTemplateToProject } from '../lib/applyRoadmapTemplate.js';
import { recalcProjectProgress } from '../lib/progress.js';
import { dispatchWebhook } from '../lib/webhooks.js';
import { isDueBeforeStart } from '../lib/dates.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

const router = Router();

// Effective budget totals: a project's own manual `budget` (if set) is
// authoritative and task budgets underneath it are read as an allocation
// breakdown; only when no manual budget is set does the total fall back to
// summing the project's own tasks/subtasks (see lib/budget.js). This is the
// single place every route in this file gets those totals from, so the
// list, single-project, create, and edit responses can never disagree.
async function budgetTotalsByProject(projects) {
  if (projects.length === 0) return new Map();
  const projectIds = projects.map((p) => p.id);
  const tasks = await prisma.task.findMany({ where: { projectId: { in: projectIds } } });
  const byProject = new Map();
  for (const t of tasks) {
    if (!byProject.has(t.projectId)) byProject.set(t.projectId, []);
    byProject.get(t.projectId).push(t);
  }
  const out = new Map();
  for (const p of projects) out.set(p.id, computeProjectBudgetTotals(byProject.get(p.id) || [], p.budget));
  return out;
}

router.get('/', requireAuth, requireWorkspaceContext, async (req, res) => {
  const ids = await accessibleProjectIds(req.user, req.workspaceId);
  const projects = await prisma.project.findMany(ids === null ? { where: { workspaceId: req.workspaceId } } : { where: { id: { in: ids } } });
  const totalsByProject = await budgetTotalsByProject(projects);
  if (await isAdmin(req.user, req.workspaceId)) {
    return res.json({ projects: projects.map((p) => projectOut(p, 'admin', totalsByProject.get(p.id))) });
  }
  // Member/Viewer write-vs-read-only comes from the workspace role, not a
  // separate per-project role — every accessible project gets the same tag.
  const myRole = req.workspaceRole === 'MEMBER' ? 'member' : 'viewer';
  res.json({ projects: projects.map((p) => projectOut(p, myRole, totalsByProject.get(p.id))) });
});

router.post('/', requireAuth, requireWorkspaceContext, requireAdmin, async (req, res) => {
  const {
    name, desc = '', client = '', due = 'Unscheduled', start = 'Unscheduled',
    budget = null, currency = 'USD', templateKey = null, templatePhases = null,
  } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  if (isDueBeforeStart(start, due)) return res.status(400).json({ error: 'Due date cannot be before the start date' });
  const { value: budgetVal, error: budgetError } = parseMoney(budget, 'Project budget');
  if (budgetError) return res.status(400).json({ error: budgetError });

  const project = await prisma.project.create({
    data: {
      id: nanoid(8), name: name.trim(), desc, client, due, start,
      budget: budgetVal, spent: 0, currency, health: 'good', progress: 0,
      integrationsJson: '[]', ownerId: req.user.id, workspaceId: req.workspaceId,
    },
  });
  // Admin doesn't need a ProjectMember row — they already have full access
  // to every project.
  await logAudit(req.user.id, 'create', 'project', project.id, { name: project.name }, project.workspaceId);

  // A reviewed/customized set of phases (from the template preview) takes
  // priority over re-fetching the template fresh by key.
  let tasksCreated = 0;
  if (Array.isArray(templatePhases) && templatePhases.length > 0) {
    tasksCreated = await applyTemplateToProject(project.id, { phases: templatePhases }, req.user.id);
  } else if (templateKey) {
    const template = await getAnyTemplate(templateKey, req.workspaceId);
    if (template) tasksCreated = await applyTemplateToProject(project.id, template, req.user.id);
  }
  if (tasksCreated > 0) project.progress = await recalcProjectProgress(project.id);
  // Always computed the same way as every other route, even when it's
  // trivially zero for a brand-new project — never falls back to the raw
  // Project.budget the create form collected, so this response can't
  // disagree with the very next GET for the same project.
  const totals = (await budgetTotalsByProject([project])).get(project.id);

  dispatchWebhook('project.created', projectOut(project));
  res.json({ project: projectOut(project, 'admin', totals), tasksCreated });
});

router.get('/:id', requireAuth, async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (!(await canAccessProject(req.user, project.id))) {
    return res.status(403).json({ error: 'You do not have access to this project' });
  }
  const myRole = (await isAdmin(req.user, project.workspaceId)) ? 'admin' : await getProjectRole(req.user, project.id);
  const totals = (await budgetTotalsByProject([project])).get(project.id);
  res.json({ project: projectOut(project, myRole, totals) });
});

router.patch('/:id', requireAuth, async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (!(await isAdmin(req.user, project.workspaceId))) {
    return res.status(403).json({ error: 'Only an Admin can edit this project' });
  }

  const nextStart = 'start' in req.body ? req.body.start : project.start;
  const nextDue = 'due' in req.body ? req.body.due : project.due;
  if (('start' in req.body || 'due' in req.body) && isDueBeforeStart(nextStart, nextDue)) {
    return res.status(400).json({ error: 'Due date cannot be before the start date' });
  }

  if ('ownerId' in req.body && req.body.ownerId !== project.ownerId) {
    const newOwner = await prisma.user.findUnique({ where: { id: req.body.ownerId }, select: { id: true } });
    if (!newOwner) return res.status(400).json({ error: 'Owner not found' });
  }

  const FIELD_MAP = { name: 'name', desc: 'desc', client: 'client', health: 'health', progress: 'progress', due: 'due', start: 'start', currency: 'currency', ownerId: 'ownerId' };
  const data = {};
  const changes = [];
  for (const [apiKey, dbKey] of Object.entries(FIELD_MAP)) {
    if (apiKey in req.body && req.body[apiKey] !== project[dbKey]) {
      changes.push({ field: apiKey, from: project[dbKey], to: req.body[apiKey] });
      data[dbKey] = req.body[apiKey];
    }
  }
  // `budget` (the manual override) supports being cleared back to null —
  // "spent" doesn't need that since it's just an accumulator, but both go
  // through the same non-negative validation as everywhere else money is
  // written (see lib/money.js).
  for (const [numKey, label] of [['budget', 'Project budget'], ['spent', 'Spent']]) {
    if (numKey in req.body) {
      const { value: next, error } = parseMoney(req.body[numKey], label);
      if (error) return res.status(400).json({ error });
      if (next !== project[numKey]) {
        changes.push({ field: numKey, from: project[numKey], to: next });
        data[numKey] = next;
      }
    }
  }

  const updated = Object.keys(data).length ? await prisma.project.update({ where: { id: project.id }, data }) : project;
  for (const change of changes) {
    await logAudit(req.user.id, 'update', 'project', project.id, change, project.workspaceId);
  }
  const totals = (await budgetTotalsByProject([updated])).get(updated.id);
  res.json({ project: projectOut(updated, 'admin', totals) });
});

// Admin-only: hide a project from the active portfolio without deleting
// its data. Distinct from delete — reversible via /unarchive.
router.post('/:id/archive', requireAuth, async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (!(await isAdmin(req.user, project.workspaceId))) return res.status(403).json({ error: 'Admin access required' });
  const updated = await prisma.project.update({ where: { id: project.id }, data: { isArchived: true } });
  await logAudit(req.user.id, 'archive', 'project', project.id, { name: project.name }, project.workspaceId);
  res.json({ project: projectOut(updated, 'admin') });
});

router.post('/:id/unarchive', requireAuth, async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (!(await isAdmin(req.user, project.workspaceId))) return res.status(403).json({ error: 'Admin access required' });
  const updated = await prisma.project.update({ where: { id: project.id }, data: { isArchived: false } });
  await logAudit(req.user.id, 'unarchive', 'project', project.id, { name: project.name }, project.workspaceId);
  res.json({ project: projectOut(updated, 'admin') });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (!(await isAdmin(req.user, project.workspaceId))) return res.status(403).json({ error: 'Admin access required' });

  let remaining = await prisma.task.findMany({ where: { projectId: project.id }, select: { id: true, parentId: true } });
  const allTaskIds = remaining.map((t) => t.id);

  if (allTaskIds.length) {
    await prisma.notification.deleteMany({ where: { taskId: { in: allTaskIds } } });
    const attachments = await prisma.attachment.findMany({ where: { taskId: { in: allTaskIds } } });
    await prisma.attachment.deleteMany({ where: { taskId: { in: allTaskIds } } });
    await prisma.comment.deleteMany({ where: { taskId: { in: allTaskIds } } });
    await prisma.taskCollaborator.deleteMany({ where: { taskId: { in: allTaskIds } } });
    await prisma.customFieldValue.deleteMany({ where: { taskId: { in: allTaskIds } } });
    await prisma.timesheetEntry.deleteMany({ where: { taskId: { in: allTaskIds } } });
    await prisma.approval.deleteMany({ where: { taskId: { in: allTaskIds } } });
    for (const a of attachments) {
      try { fs.unlinkSync(path.join(UPLOAD_DIR, a.storedName)); } catch { /* already gone */ }
    }
    // Peel off leaf tasks layer by layer so nested subtasks at any depth
    // are always deleted before their parent, satisfying the
    // self-referential FK without needing to know the tree's shape.
    while (remaining.length) {
      const leafIds = remaining.filter((t) => !remaining.some((other) => other.parentId === t.id)).map((t) => t.id);
      await prisma.task.deleteMany({ where: { id: { in: leafIds } } });
      remaining = remaining.filter((t) => !leafIds.includes(t.id));
    }
  }

  await prisma.notification.deleteMany({ where: { projectId: project.id } });
  await prisma.automationRule.deleteMany({ where: { projectId: project.id } });
  await prisma.projectMember.deleteMany({ where: { projectId: project.id } });
  await prisma.customFieldDef.deleteMany({ where: { projectId: project.id } });
  await prisma.timesheetEntry.deleteMany({ where: { projectId: project.id } });
  await prisma.goal.deleteMany({ where: { projectId: project.id } });
  await prisma.issue.deleteMany({ where: { projectId: project.id } });
  await prisma.chatMessage.deleteMany({ where: { projectId: project.id } });
  await prisma.sprint.deleteMany({ where: { projectId: project.id } });
  await prisma.project.delete({ where: { id: project.id } });

  await logAudit(req.user.id, 'delete', 'project', project.id, { name: project.name, tasksDeleted: allTaskIds.length }, project.workspaceId);
  res.json({ ok: true });
});

router.get('/:id/members', requireAuth, async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (!(await canAccessProject(req.user, project.id))) {
    return res.status(403).json({ error: 'You do not have access to this project' });
  }
  const members = await prisma.projectMember.findMany({ where: { projectId: req.params.id } });
  res.json({ members });
});

// Project assignment is now a pure visibility marker — no per-project role.
// Whether an assigned person can edit or only view comes entirely from
// their workspace role (Member = edit, Viewer = read-only).
router.post('/:id/members', requireAuth, async (req, res) => {
  const { personId } = req.body;
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (!(await isAdmin(req.user, project.workspaceId))) return res.status(403).json({ error: 'Admin access required' });

  const existing = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId: project.id, userId: personId } } });
  if (existing) return res.status(409).json({ error: 'This person is already a member of this project' });

  await prisma.projectMember.create({ data: { projectId: project.id, userId: personId } });
  await logAudit(req.user.id, 'add_member', 'project', project.id, { personId }, project.workspaceId);
  await notifyUser(personId, { text: `You were added to ${project.name}`, projectId: project.id, icon: 'i-users', color: 'var(--brand-500)' });
  broadcast('project.access.changed', { projectId: project.id, userId: personId });

  const members = await prisma.projectMember.findMany({ where: { projectId: project.id } });
  res.json({ members });
});

router.delete('/:id/members/:userId', requireAuth, async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (!(await isAdmin(req.user, project.workspaceId))) return res.status(403).json({ error: 'Admin access required' });
  if (req.params.userId === project.ownerId) {
    return res.status(400).json({ error: 'Cannot remove the project owner' });
  }

  await prisma.projectMember.deleteMany({ where: { projectId: project.id, userId: req.params.userId } });
  await logAudit(req.user.id, 'remove_member', 'project', project.id, { personId: req.params.userId }, project.workspaceId);
  broadcast('project.access.changed', { projectId: project.id, userId: req.params.userId });

  const members = await prisma.projectMember.findMany({ where: { projectId: project.id } });
  res.json({ members });
});

export default router;
