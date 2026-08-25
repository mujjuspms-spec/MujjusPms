import { Router } from 'express';
import * as XLSX from 'xlsx';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../lib/auth.js';
import { canAccessProject, canCreateOwnTimesheet, isAdmin, accessibleProjectIds, requireWorkspaceContext, requireWorkspaceRole, workspaceIdForProject } from '../lib/permissions.js';
import { logAudit } from '../lib/audit.js';
import { timesheetOut } from '../lib/serialize.js';

const router = Router();

router.get('/project/:projectId', requireAuth, async (req, res) => {
  if (!(await canAccessProject(req.user, req.params.projectId))) return res.status(403).json({ error: 'You do not have access to this project' });
  const rows = await prisma.timesheetEntry.findMany({
    where: { projectId: req.params.projectId },
    orderBy: { date: 'desc' },
  });
  res.json({ entries: rows.map(timesheetOut) });
});

// A person's own logged hours across every project — only that person or
// a workspace Admin (of a workspace the target user actually belongs to)
// may pull this cross-project view of someone's worked hours.
router.get('/user/:userId', requireAuth, requireWorkspaceContext, async (req, res) => {
  if (req.user.id !== req.params.userId) {
    if (!(await isAdmin(req.user, req.workspaceId))) {
      return res.status(403).json({ error: 'You can only view your own timesheet' });
    }
    const targetMembership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: req.workspaceId, userId: req.params.userId } },
    });
    if (!targetMembership || targetMembership.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'You can only view your own timesheet' });
    }
  }
  const rows = await prisma.timesheetEntry.findMany({
    where: { userId: req.params.userId },
    orderBy: { date: 'desc' },
  });
  res.json({ entries: rows.map(timesheetOut) });
});

// Total hours logged per project, across everyone — powers the portfolio-wide Timesheets list.
router.get('/summary', requireAuth, requireWorkspaceContext, async (req, res) => {
  const ids = await accessibleProjectIds(req.user, req.workspaceId);
  const rows = await prisma.timesheetEntry.groupBy({ by: ['projectId'], _sum: { hours: true }, where: ids === null ? { project: { workspaceId: req.workspaceId } } : { projectId: { in: ids } } });
  res.json({ totals: rows.map((r) => ({ projectId: r.projectId, hours: r._sum.hours || 0 })) });
});

// Workspace-admin-only .xlsx export, scoped to this workspace's own
// projects/tasks/people only. We only ever WRITE a workbook here from our
// own trusted DB rows — never XLSX.read() on untrusted input — so the
// known SheetJS parser CVEs (which affect reading malicious files) don't apply.
router.get('/export', requireAuth, requireWorkspaceContext, requireWorkspaceRole('ADMIN'), async (req, res) => {
  const { projectId } = req.query;
  const ids = await accessibleProjectIds(req.user, req.workspaceId);
  const scopeWhere = ids === null ? { project: { workspaceId: req.workspaceId } } : { projectId: { in: ids } };
  const rows = await prisma.timesheetEntry.findMany({
    where: projectId ? { projectId, ...scopeWhere } : scopeWhere,
    orderBy: [{ projectId: 'asc' }, { date: 'desc' }],
  });
  const [projects, tasks, members] = await Promise.all([
    prisma.project.findMany({ where: { workspaceId: req.workspaceId }, select: { id: true, name: true } }),
    prisma.task.findMany({ where: { project: { workspaceId: req.workspaceId } }, select: { id: true, title: true } }),
    prisma.workspaceMember.findMany({ where: { workspaceId: req.workspaceId }, include: { user: { select: { id: true, name: true } } } }),
  ]);
  const users = members.map((m) => m.user);
  const projectName = Object.fromEntries(projects.map((p) => [p.id, p.name]));
  const taskTitle = Object.fromEntries(tasks.map((t) => [t.id, t.title]));
  const userName = Object.fromEntries(users.map((u) => [u.id, u.name]));

  const sheetRows = rows.map((r) => ({
    Project: projectName[r.projectId] || r.projectId,
    Task: r.taskId ? (taskTitle[r.taskId] || r.taskId) : 'General',
    Person: userName[r.userId] || r.userId,
    Date: r.date,
    Hours: r.hours,
    Note: r.note || '',
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sheetRows);
  ws['!cols'] = [{ wch: 22 }, { wch: 32 }, { wch: 18 }, { wch: 14 }, { wch: 8 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Timesheet');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  await logAudit(req.user.id, 'export', 'timesheet', projectId || 'all', { rows: rows.length }, req.workspaceId);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="timesheet${projectId ? `-${projectId}` : ''}.xlsx"`);
  res.send(buf);
});

router.post('/', requireAuth, async (req, res) => {
  const { projectId, taskId = null, date, hours, note = '' } = req.body;
  if (!projectId || !date || !hours) return res.status(400).json({ error: 'projectId, date and hours are required' });
  if (!(await canCreateOwnTimesheet(req.user, projectId))) return res.status(403).json({ error: 'Viewers cannot log time' });

  const workspaceId = await workspaceIdForProject(projectId);
  const settings = await prisma.workspaceSettings.findUnique({ where: { workspaceId } });
  if (settings) {
    if (!settings.timeTrackingEnabled) return res.status(403).json({ error: 'Time tracking is disabled for this workspace' });
    if (!settings.allowManualEntry) return res.status(403).json({ error: 'Manual time entry is disabled for this workspace — use the timer instead' });
    if (settings.requireTaskSelection && !taskId) return res.status(400).json({ error: 'Select a task for this time entry' });
    if (settings.requireNotes && !note.trim()) return res.status(400).json({ error: 'A note is required for time entries' });
    const entryDate = new Date(date);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (!settings.allowFutureEntries && entryDate > today) return res.status(400).json({ error: 'Future time entries are not allowed for this workspace' });
    if (!settings.allowBackdatedEntries && entryDate < today) return res.status(400).json({ error: 'Backdated time entries are not allowed for this workspace' });
  }

  const entry = await prisma.timesheetEntry.create({
    data: { projectId, taskId, userId: req.user.id, date, hours: Number(hours), note },
  });
  await logAudit(req.user.id, 'create', 'timesheet', entry.id, { projectId, taskId, hours: entry.hours }, workspaceId);
  res.status(201).json({ entry: timesheetOut(entry) });
});

// Only the entry's own author may delete it — Admin can view every entry
// but never edits or deletes someone else's without a (not yet built)
// approval-override feature.
router.delete('/:id', requireAuth, async (req, res) => {
  const entry = await prisma.timesheetEntry.findUnique({ where: { id: req.params.id } });
  if (!entry) return res.status(404).json({ error: 'Entry not found' });
  if (entry.userId !== req.user.id) {
    return res.status(403).json({ error: 'You can only delete your own time entries' });
  }
  await prisma.timesheetEntry.delete({ where: { id: entry.id } });
  await logAudit(req.user.id, 'delete', 'timesheet', entry.id, { projectId: entry.projectId }, await workspaceIdForProject(entry.projectId));
  res.json({ ok: true });
});

export default router;
