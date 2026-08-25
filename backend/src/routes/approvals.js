import { Router } from 'express';
import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../lib/auth.js';
import { canAccessProject, canModifyProject, isAdmin, projectIdForTask, workspaceIdForTask } from '../lib/permissions.js';
import { logAudit } from '../lib/audit.js';
import { notifyUser } from '../lib/notify.js';
import { broadcast } from '../lib/sse.js';
import { approvalOut } from '../lib/serialize.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  if (!req.query.mine && !req.query.taskId) return res.status(400).json({ error: 'mine or taskId is required' });
  if (req.query.taskId) {
    const projectId = await projectIdForTask(req.query.taskId);
    if (!projectId) return res.status(404).json({ error: 'Task not found' });
    if (!(await canAccessProject(req.user, projectId))) return res.status(403).json({ error: 'You do not have access to this project' });
  }
  const where = {};
  if (req.query.mine) where.approverId = req.user.id;
  if (req.query.taskId) where.taskId = req.query.taskId;
  const rows = await prisma.approval.findMany({ where, orderBy: [{ createdAt: 'desc' }, { sequence: 'asc' }] });
  res.json({ approvals: rows.map(approvalOut) });
});

// Creates a multi-step approval chain: an ordered list of approvers sharing
// one groupId. Only the step at sequence 0 starts "pending" — the rest sit
// "waiting" until every prior step approves (see PATCH below).
router.post('/', requireAuth, async (req, res) => {
  const { taskId, note = '' } = req.body;
  const approverIds = (Array.isArray(req.body.approverIds) ? req.body.approverIds : [req.body.approverId]).filter(Boolean);
  if (!taskId || approverIds.length === 0) return res.status(400).json({ error: 'taskId and at least one approver are required' });

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!(await canModifyProject(req.user, task.projectId))) return res.status(403).json({ error: 'Viewers cannot request approvals' });

  const active = await prisma.approval.findFirst({ where: { taskId, status: { in: ['pending', 'waiting'] } } });
  if (active) return res.status(409).json({ error: 'This task already has an approval chain in progress' });

  const groupId = crypto.randomUUID();
  const chain = [];
  for (let i = 0; i < approverIds.length; i++) {
    const approval = await prisma.approval.create({
      data: { taskId, requestedById: req.user.id, approverId: approverIds[i], note, groupId, sequence: i, status: i === 0 ? 'pending' : 'waiting' },
    });
    chain.push(approval);
  }
  await logAudit(req.user.id, 'create', 'approval', groupId, { taskId, approverIds }, await workspaceIdForTask(taskId));
  await notifyUser(approverIds[0], { text: `${req.user.name} requested your approval on "${task.title}"`, projectId: task.projectId, taskId, icon: 'i-shield', color: 'var(--brand-500)' });
  chain.forEach((a) => broadcast('approval.created', approvalOut(a)));
  res.status(201).json({ approvals: chain.map(approvalOut) });
});

router.patch('/:id', requireAuth, async (req, res) => {
  const existing = await prisma.approval.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Approval not found' });
  if (existing.status !== 'pending') return res.status(409).json({ error: 'This approval step is not currently actionable' });
  // Deliberately matches every other permission check in this app: a
  // workspace Admin can act on anything, including an approval step
  // assigned to someone else — not a bypass, just Admin's usual authority.
  if (existing.approverId !== req.user.id && !(await isAdmin(req.user, await workspaceIdForTask(existing.taskId)))) {
    return res.status(403).json({ error: 'Only the assigned approver or a workspace Admin can decide this' });
  }
  const { status, note } = req.body;
  if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'status must be approved or rejected' });

  const approval = await prisma.approval.update({
    where: { id: existing.id }, data: { status, note: note ?? existing.note, decidedAt: new Date() },
  });
  await logAudit(req.user.id, 'decide', 'approval', approval.id, { status }, await workspaceIdForTask(existing.taskId));
  const touched = [approval];

  const task = await prisma.task.findUnique({ where: { id: approval.taskId } });

  if (status === 'rejected' && approval.groupId) {
    const rest = await prisma.approval.findMany({ where: { groupId: approval.groupId, status: 'waiting' } });
    for (const r of rest) {
      touched.push(await prisma.approval.update({ where: { id: r.id }, data: { status: 'rejected', decidedAt: new Date() } }));
    }
  }

  if (status === 'approved' && approval.groupId) {
    const next = await prisma.approval.findFirst({ where: { groupId: approval.groupId, sequence: approval.sequence + 1 } });
    if (next) {
      const promoted = await prisma.approval.update({ where: { id: next.id }, data: { status: 'pending' } });
      touched.push(promoted);
      if (task) await notifyUser(promoted.approverId, { text: `${req.user.name} approved a step — your approval is now needed on "${task.title}"`, projectId: task.projectId, taskId: task.id, icon: 'i-shield', color: 'var(--brand-500)' });
    }
  }

  if (task) {
    await notifyUser(approval.requestedById, {
      text: `${req.user.name} ${status} your approval request on "${task.title}"`,
      projectId: task.projectId, taskId: task.id, icon: status === 'approved' ? 'i-check-c' : 'i-x', color: status === 'approved' ? 'var(--status-good)' : 'var(--status-critical)',
    });
  }
  touched.forEach((a) => broadcast('approval.updated', approvalOut(a)));
  res.json({ approval: approvalOut(approval), chain: touched.map(approvalOut) });
});

export default router;
