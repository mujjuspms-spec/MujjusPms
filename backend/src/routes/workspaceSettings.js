import { Router } from 'express';
import multer from 'multer';
import { nanoid } from 'nanoid';
import * as XLSX from 'xlsx';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../lib/auth.js';
import { requireWorkspaceContext, requireWorkspaceRole } from '../lib/permissions.js';
import { logAudit } from '../lib/audit.js';
import { supabase } from '../lib/supabase.js';

const uploadLogo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
});

const router = Router({ mergeParams: true });

async function loadAdminWorkspace(req, res, next) {
  const workspace = await prisma.workspace.findUnique({ where: { id: req.params.id } });
  if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
  req.workspace = workspace;
  next();
}

// A workspace is only ever reached here as an Admin OF THAT workspace —
// requireWorkspaceContext resolves membership from X-Workspace-Id, and
// req.params.id must match it, so an Admin of workspace A can never touch
// workspace B's settings just by changing the URL.
async function requireSameWorkspace(req, res, next) {
  if (req.params.id !== req.workspaceId) return res.status(403).json({ error: 'Not a member of this workspace' });
  next();
}

const GATE = [requireAuth, requireWorkspaceContext, requireWorkspaceRole('ADMIN'), requireSameWorkspace, loadAdminWorkspace];

function generalOut(w) {
  return {
    id: w.id, name: w.name, slug: w.slug, timezone: w.timezone, logoUrl: w.logoUrl ? `/api/workspaces/${w.id}/settings/logo` : null,
    description: w.description, industry: w.industry, teamSize: w.teamSize, defaultLanguage: w.defaultLanguage,
    dateFormat: w.dateFormat, timeFormat: w.timeFormat, startOfWeek: w.startOfWeek, isArchived: w.isArchived,
  };
}

async function getOrCreateSettings(workspaceId) {
  const existing = await prisma.workspaceSettings.findUnique({ where: { workspaceId } });
  if (existing) return existing;
  return prisma.workspaceSettings.create({ data: { workspaceId } });
}

function settingsOut(s) {
  return {
    workSchedule: {
      workingDays: JSON.parse(s.workingDaysJson || '[]'), workStart: s.workStart, workEnd: s.workEnd,
      weeklyCapacity: s.weeklyCapacity, holidayCalendar: s.holidayCalendar,
    },
    projects: {
      defaultProjectView: s.defaultProjectView, allowMembersCreateProjects: s.allowMembersCreateProjects, projectIdPrefix: s.projectIdPrefix,
    },
    tasks: {
      allowMemberTaskCreation: s.allowMemberTaskCreation, allowViewerComments: s.allowViewerComments, taskIdPrefix: s.taskIdPrefix,
      defaultAssigneeBehavior: s.defaultAssigneeBehavior, completedTaskBehavior: s.completedTaskBehavior,
    },
    timesheets: {
      timeTrackingEnabled: s.timeTrackingEnabled, requireTaskSelection: s.requireTaskSelection, requireProjectSelection: s.requireProjectSelection,
      allowManualEntry: s.allowManualEntry, allowTimer: s.allowTimer, requireNotes: s.requireNotes,
      allowFutureEntries: s.allowFutureEntries, allowBackdatedEntries: s.allowBackdatedEntries,
      timesheetWeekStart: s.timesheetWeekStart, submissionFrequency: s.submissionFrequency,
    },
    notifications: {
      taskAssignment: s.notifyTaskAssignment, taskDueSoon: s.notifyTaskDueSoon, taskOverdue: s.notifyTaskOverdue,
      projectStatusChange: s.notifyProjectStatus, projectDeadline: s.notifyProjectDeadline, commentsMentions: s.notifyCommentsMentions,
      invitationUpdates: s.notifyInvitationUpdates, timesheetSubmission: s.notifyTimesheetSubmit, timesheetApproval: s.notifyTimesheetApproval,
    },
    security: {
      allowedEmailDomains: JSON.parse(s.allowedEmailDomainsJson || '[]'), allowExternalSharing: s.allowExternalSharing,
    },
  };
}

router.get('/', ...GATE, async (req, res) => {
  const settings = await getOrCreateSettings(req.params.id);
  res.json({ general: generalOut(req.workspace), settings: settingsOut(settings) });
});

router.patch('/general', ...GATE, async (req, res) => {
  const { name, description, slug, industry, teamSize, defaultLanguage, timezone, dateFormat, timeFormat, startOfWeek } = req.body;
  const data = {};
  const changes = [];
  const w = req.workspace;

  if (name !== undefined) {
    if (!name.trim()) return res.status(400).json({ error: 'Workspace name is required' });
    if (name.trim() !== w.name) { changes.push({ field: 'name', from: w.name, to: name.trim() }); data.name = name.trim(); }
  }
  for (const [key, val] of Object.entries({ description, industry, teamSize, defaultLanguage, timezone, dateFormat, timeFormat, startOfWeek })) {
    if (val !== undefined && val !== w[key]) { changes.push({ field: key, from: w[key], to: val }); data[key] = val; }
  }

  let slugWarning = null;
  if (slug !== undefined && slug.trim() && slug.trim() !== w.slug) {
    const normalized = slug.trim().toLowerCase();
    if (!/^[a-z0-9-]+$/.test(normalized)) return res.status(400).json({ error: 'Workspace URL can only contain lowercase letters, numbers and hyphens' });
    const clash = await prisma.workspace.findFirst({ where: { slug: normalized, id: { not: w.id } } });
    if (clash) return res.status(409).json({ error: 'This workspace URL is already taken' });
    changes.push({ field: 'slug', from: w.slug, to: normalized });
    data.slug = normalized;
    slugWarning = 'Existing bookmarked links using the old workspace URL will stop working.';
  }

  const updated = Object.keys(data).length ? await prisma.workspace.update({ where: { id: w.id }, data }) : w;
  for (const change of changes) {
    await logAudit(req.user.id, 'update_workspace_settings', 'workspace', w.id, change, w.id);
  }
  res.json({ general: generalOut(updated), slugWarning });
});

router.post('/logo', ...GATE, uploadLogo.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Choose an image file (5MB max)' });
  
  const storedName = `wslogo-${nanoid(10)}__${req.file.originalname}`;
  const { error } = await supabase.storage.from('attachments').upload(storedName, req.file.buffer, { contentType: req.file.mimetype });
  if (error) return res.status(500).json({ error: 'Upload failed' });
  
  const previous = req.workspace.logoUrl;
  const updated = await prisma.workspace.update({ where: { id: req.workspace.id }, data: { logoUrl: storedName } });
  
  if (previous) await supabase.storage.from('attachments').remove([previous]);
  
  await logAudit(req.user.id, 'update_workspace_logo', 'workspace', req.workspace.id, {}, req.workspace.id);
  res.json({ general: generalOut(updated) });
});

router.delete('/logo', ...GATE, async (req, res) => {
  if (req.workspace.logoUrl) await supabase.storage.from('attachments').remove([req.workspace.logoUrl]);
  const updated = await prisma.workspace.update({ where: { id: req.workspace.id }, data: { logoUrl: null } });
  await logAudit(req.user.id, 'remove_workspace_logo', 'workspace', req.workspace.id, {}, req.workspace.id);
  res.json({ general: generalOut(updated) });
});

router.get('/logo', requireAuth, async (req, res) => {
  const workspace = await prisma.workspace.findUnique({ where: { id: req.params.id } });
  if (!workspace?.logoUrl) return res.status(404).json({ error: 'No logo set' });
  
  const { data, error } = await supabase.storage.from('attachments').createSignedUrl(workspace.logoUrl, 60);
  if (error || !data?.signedUrl) return res.status(500).json({ error: 'Failed to generate logo link' });
  
  res.redirect(data.signedUrl);
});

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

router.patch('/work-schedule', ...GATE, async (req, res) => {
  const { workingDays, workStart, workEnd, weeklyCapacity, holidayCalendar } = req.body;
  const data = {};
  if (workingDays !== undefined) {
    if (!Array.isArray(workingDays)) return res.status(400).json({ error: 'workingDays must be a list of days' });
    data.workingDaysJson = JSON.stringify(workingDays);
  }
  if (workStart !== undefined || workEnd !== undefined) {
    const current = await getOrCreateSettings(req.params.id);
    const start = workStart ?? current.workStart;
    const end = workEnd ?? current.workEnd;
    if (!TIME_RE.test(start) || !TIME_RE.test(end) || start >= end) {
      return res.status(400).json({ error: 'Working hours must be valid times with start before end' });
    }
    if (workStart !== undefined) data.workStart = workStart;
    if (workEnd !== undefined) data.workEnd = workEnd;
  }
  if (weeklyCapacity !== undefined) {
    const next = Number(weeklyCapacity);
    if (!Number.isInteger(next) || next <= 0) return res.status(400).json({ error: 'Weekly capacity must be a positive whole number' });
    data.weeklyCapacity = next;
  }
  if (holidayCalendar !== undefined) data.holidayCalendar = holidayCalendar;

  await getOrCreateSettings(req.params.id);
  const updated = await prisma.workspaceSettings.update({ where: { workspaceId: req.params.id }, data });
  await logAudit(req.user.id, 'update_workspace_settings', 'workspace', req.params.id, { section: 'work-schedule', ...req.body }, req.params.id);
  res.json({ settings: settingsOut(updated) });
});

function makeSectionRoute(section, fields) {
  router.patch(`/${section}`, ...GATE, async (req, res) => {
    const data = {};
    for (const f of fields) {
      if (req.body[f] !== undefined) data[f] = req.body[f];
    }
    await getOrCreateSettings(req.params.id);
    const updated = await prisma.workspaceSettings.update({ where: { workspaceId: req.params.id }, data });
    await logAudit(req.user.id, 'update_workspace_settings', 'workspace', req.params.id, { section, ...req.body }, req.params.id);
    res.json({ settings: settingsOut(updated) });
  });
}

makeSectionRoute('projects', ['defaultProjectView', 'allowMembersCreateProjects', 'projectIdPrefix']);
makeSectionRoute('tasks', ['allowMemberTaskCreation', 'allowViewerComments', 'taskIdPrefix', 'defaultAssigneeBehavior', 'completedTaskBehavior']);
makeSectionRoute('timesheets', [
  'timeTrackingEnabled', 'requireTaskSelection', 'requireProjectSelection', 'allowManualEntry', 'allowTimer',
  'requireNotes', 'allowFutureEntries', 'allowBackdatedEntries', 'timesheetWeekStart', 'submissionFrequency',
]);

router.patch('/notifications', ...GATE, async (req, res) => {
  const MAP = {
    taskAssignment: 'notifyTaskAssignment', taskDueSoon: 'notifyTaskDueSoon', taskOverdue: 'notifyTaskOverdue',
    projectStatusChange: 'notifyProjectStatus', projectDeadline: 'notifyProjectDeadline', commentsMentions: 'notifyCommentsMentions',
    invitationUpdates: 'notifyInvitationUpdates', timesheetSubmission: 'notifyTimesheetSubmit', timesheetApproval: 'notifyTimesheetApproval',
  };
  const data = {};
  for (const [apiKey, dbKey] of Object.entries(MAP)) {
    if (req.body[apiKey] !== undefined) data[dbKey] = !!req.body[apiKey];
  }
  await getOrCreateSettings(req.params.id);
  const updated = await prisma.workspaceSettings.update({ where: { workspaceId: req.params.id }, data });
  await logAudit(req.user.id, 'update_workspace_settings', 'workspace', req.params.id, { section: 'notifications', ...req.body }, req.params.id);
  res.json({ settings: settingsOut(updated) });
});

router.patch('/security', ...GATE, async (req, res) => {
  const { allowedEmailDomains, allowExternalSharing } = req.body;
  const data = {};
  if (allowedEmailDomains !== undefined) {
    if (!Array.isArray(allowedEmailDomains)) return res.status(400).json({ error: 'allowedEmailDomains must be a list' });
    data.allowedEmailDomainsJson = JSON.stringify(allowedEmailDomains.map((d) => d.trim().toLowerCase()).filter(Boolean));
  }
  if (allowExternalSharing !== undefined) data.allowExternalSharing = !!allowExternalSharing;
  await getOrCreateSettings(req.params.id);
  const updated = await prisma.workspaceSettings.update({ where: { workspaceId: req.params.id }, data });
  await logAudit(req.user.id, 'update_workspace_settings', 'workspace', req.params.id, { section: 'security', ...req.body }, req.params.id);
  res.json({ settings: settingsOut(updated) });
});

// Workspace-scoped CSV/XLSX export — same xlsx-based approach already used
// by reports.js/timesheets.js, just for Projects/Tasks/Members specifically.
// Admin always sees the whole workspace; there is never any other
// workspace's data in the query since everything filters on req.workspace.id.
router.get('/export/:kind', ...GATE, async (req, res) => {
  const { kind } = req.params;
  if (!['projects', 'tasks', 'members'].includes(kind)) return res.status(404).json({ error: 'Unknown export kind' });
  const workspaceId = req.workspace.id;

  let rows;
  let cols;
  if (kind === 'projects') {
    const projects = await prisma.project.findMany({ where: { workspaceId } });
    rows = projects.map((p) => ({
      Name: p.name, Client: p.client, Health: p.health, 'Progress %': p.progress,
      'Budget (USD)': p.budget, 'Spent (USD)': p.spent, Start: p.start, Due: p.due, Archived: p.isArchived,
    }));
    cols = [{ wch: 24 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 10 }];
  } else if (kind === 'tasks') {
    const tasks = await prisma.task.findMany({ where: { project: { workspaceId } } });
    const projects = await prisma.project.findMany({ where: { workspaceId }, select: { id: true, name: true } });
    const projectName = Object.fromEntries(projects.map((p) => [p.id, p.name]));
    rows = tasks.map((t) => ({
      Title: t.title, Project: projectName[t.projectId] || t.projectId, Status: t.status, Priority: t.priority,
      Due: t.due, 'Progress %': t.progress,
    }));
    cols = [{ wch: 32 }, { wch: 22 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 }];
  } else {
    const members = await prisma.workspaceMember.findMany({ where: { workspaceId, status: 'ACTIVE' }, include: { user: true } });
    rows = members.map((m) => ({
      Name: m.user.name, Email: m.user.email, 'Job Title': m.user.role, Role: m.role, 'Joined At': m.joinedAt,
    }));
    cols = [{ wch: 22 }, { wch: 28 }, { wch: 22 }, { wch: 10 }, { wch: 16 }];
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = cols;
  XLSX.utils.book_append_sheet(wb, ws, kind);
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  await logAudit(req.user.id, 'export_workspace_data', 'workspace', workspaceId, { kind, rows: rows.length }, workspaceId);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${kind}.xlsx"`);
  res.send(buf);
});

router.post('/archive', ...GATE, async (req, res) => {
  const updated = await prisma.workspace.update({ where: { id: req.workspace.id }, data: { isArchived: true } });
  await logAudit(req.user.id, 'archive_workspace', 'workspace', req.workspace.id, {}, req.workspace.id);
  res.json({ general: generalOut(updated) });
});

router.post('/unarchive', ...GATE, async (req, res) => {
  const updated = await prisma.workspace.update({ where: { id: req.workspace.id }, data: { isArchived: false } });
  await logAudit(req.user.id, 'unarchive_workspace', 'workspace', req.workspace.id, {}, req.workspace.id);
  res.json({ general: generalOut(updated) });
});

// Permanently deletes a workspace and every row scoped to it — mirrors the
// exact cascade already used by projects.js's DELETE /:id, run once per
// project in this workspace, then the workspace-level rows, all inside one
// transaction so a failure partway through never leaves a half-deleted state.
router.delete('/', ...GATE, async (req, res) => {
  const { confirmName } = req.body;
  if (confirmName !== req.workspace.name) {
    return res.status(400).json({ error: 'Type the workspace name exactly to confirm deletion' });
  }
  const workspaceId = req.workspace.id;

  await prisma.$transaction(async (tx) => {
    const projects = await tx.project.findMany({ where: { workspaceId }, select: { id: true } });
    for (const { id: projectId } of projects) {
      let remaining = await tx.task.findMany({ where: { projectId }, select: { id: true, parentId: true } });
      const allTaskIds = remaining.map((t) => t.id);
      if (allTaskIds.length) {
        await tx.notification.deleteMany({ where: { taskId: { in: allTaskIds } } });
        await tx.attachment.deleteMany({ where: { taskId: { in: allTaskIds } } });
        await tx.comment.deleteMany({ where: { taskId: { in: allTaskIds } } });
        await tx.taskCollaborator.deleteMany({ where: { taskId: { in: allTaskIds } } });
        await tx.customFieldValue.deleteMany({ where: { taskId: { in: allTaskIds } } });
        await tx.timesheetEntry.deleteMany({ where: { taskId: { in: allTaskIds } } });
        await tx.approval.deleteMany({ where: { taskId: { in: allTaskIds } } });
        while (remaining.length) {
          const leafIds = remaining.filter((t) => !remaining.some((other) => other.parentId === t.id)).map((t) => t.id);
          await tx.task.deleteMany({ where: { id: { in: leafIds } } });
          remaining = remaining.filter((t) => !leafIds.includes(t.id));
        }
      }
      await tx.notification.deleteMany({ where: { projectId } });
      await tx.automationRule.deleteMany({ where: { projectId } });
      await tx.projectMember.deleteMany({ where: { projectId } });
      await tx.customFieldDef.deleteMany({ where: { projectId } });
      await tx.timesheetEntry.deleteMany({ where: { projectId } });
      await tx.goal.deleteMany({ where: { projectId } });
      await tx.issue.deleteMany({ where: { projectId } });
      await tx.chatMessage.deleteMany({ where: { projectId } });
      await tx.sprint.deleteMany({ where: { projectId } });
    }
    await tx.project.deleteMany({ where: { workspaceId } });
    await tx.projectTemplate.deleteMany({ where: { workspaceId } });
    await tx.workspaceInvitation.deleteMany({ where: { workspaceId } });
    await tx.workspaceMember.deleteMany({ where: { workspaceId } });
    await tx.workspaceSettings.deleteMany({ where: { workspaceId } });
    await tx.workspace.delete({ where: { id: workspaceId } });
  });

  await logAudit(req.user.id, 'delete_workspace', 'workspace', workspaceId, { name: req.workspace.name });
  res.json({ ok: true });
});

export default router;
