import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../lib/auth.js';
import { workspaceIdForProject, canCreateOwnTimesheet } from '../lib/permissions.js';
import { logAudit } from '../lib/audit.js';
import { broadcast } from '../lib/sse.js';
import { timesheetOut } from '../lib/serialize.js';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Matches the app's display date convention ("20 Aug 2026") used
// everywhere else a TimesheetEntry.date is rendered.
function formatDateForEntry(d) {
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

function timerOut(t) {
  return { id: t.id, projectId: t.projectId, taskId: t.taskId, startedAt: t.startedAt };
}

async function finalizeTimer(timer) {
  const hours = Math.round(((Date.now() - new Date(timer.startedAt).getTime()) / 3600000) * 100) / 100;
  await prisma.activeTimer.delete({ where: { id: timer.id } });
  if (hours <= 0) return null;
  const entry = await prisma.timesheetEntry.create({
    data: { projectId: timer.projectId, taskId: timer.taskId, userId: timer.userId, date: formatDateForEntry(new Date()), hours, note: 'Logged via timer' },
  });
  return entry;
}

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const timer = await prisma.activeTimer.findUnique({ where: { userId: req.user.id } });
  res.json({ timer: timer ? timerOut(timer) : null });
});

router.post('/start', requireAuth, async (req, res) => {
  const { projectId, taskId = null } = req.body;
  if (!projectId) return res.status(400).json({ error: 'projectId is required' });
  if (!(await canCreateOwnTimesheet(req.user, projectId))) return res.status(403).json({ error: 'Viewers cannot log time' });

  const workspaceId = await workspaceIdForProject(projectId);
  const settings = await prisma.workspaceSettings.findUnique({ where: { workspaceId } });
  if (settings && !settings.timeTrackingEnabled) return res.status(403).json({ error: 'Time tracking is disabled for this workspace' });
  if (settings && !settings.allowTimer) return res.status(403).json({ error: 'The timer is disabled for this workspace — log time manually instead' });

  const existing = await prisma.activeTimer.findUnique({ where: { userId: req.user.id } });
  if (existing) await finalizeTimer(existing);

  const timer = await prisma.activeTimer.create({ data: { userId: req.user.id, projectId, taskId } });
  res.json({ timer: timerOut(timer) });
});

router.post('/stop', requireAuth, async (req, res) => {
  const timer = await prisma.activeTimer.findUnique({ where: { userId: req.user.id } });
  if (!timer) return res.status(400).json({ error: 'No timer is running' });

  const entry = await finalizeTimer(timer);
  if (entry) {
    await logAudit(req.user.id, 'create', 'timesheet', entry.id, { via: 'timer', hours: entry.hours }, await workspaceIdForProject(entry.projectId));
    broadcast('timesheet.created', timesheetOut(entry));
  }
  res.json({ entry: entry ? timesheetOut(entry) : null });
});

export default router;
