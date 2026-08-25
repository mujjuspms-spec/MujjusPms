import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../lib/auth.js';
import { canAccessProject, canCommentOnTask, isAdmin, projectIdForTask, workspaceIdForTask } from '../lib/permissions.js';
import { logAudit } from '../lib/audit.js';
import { notifyUser } from '../lib/notify.js';
import { notificationEnabled } from '../lib/workspaceSettings.js';
import { extractMentions } from '../lib/mentions.js';

const router = Router();

function commentOut(c) {
  return {
    id: c.id, taskId: c.taskId, authorId: c.authorId, body: c.body,
    mentions: JSON.parse(c.mentionsJson || '[]'), createdAt: c.createdAt, editedAt: c.editedAt,
  };
}

router.get('/task/:taskId', requireAuth, async (req, res) => {
  const projectId = await projectIdForTask(req.params.taskId);
  if (!projectId) return res.status(404).json({ error: 'Task not found' });
  if (!(await canAccessProject(req.user, projectId))) return res.status(403).json({ error: 'You do not have access to this project' });
  const comments = await prisma.comment.findMany({ where: { taskId: req.params.taskId }, orderBy: { createdAt: 'asc' } });
  res.json({ comments: comments.map(commentOut) });
});

router.post('/tasks/:taskId/comments', requireAuth, async (req, res) => {
  const { body } = req.body;
  if (!body || !body.trim()) return res.status(400).json({ error: 'Comment body is required' });
  const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!(await canCommentOnTask(req.user, task.projectId))) return res.status(403).json({ error: 'Viewers cannot comment' });

  const users = await prisma.user.findMany();
  const mentionIds = extractMentions(body, users).filter((id) => id !== req.user.id);

  const comment = await prisma.comment.create({
    data: { taskId: task.id, authorId: req.user.id, body: body.trim(), mentionsJson: JSON.stringify(mentionIds) },
  });

  const commentWorkspaceId = await workspaceIdForTask(task.id);
  await logAudit(req.user.id, 'comment', 'task', task.id, { commentId: comment.id, mentions: mentionIds }, commentWorkspaceId);

  const notifyOnComments = await notificationEnabled(commentWorkspaceId, 'commentsMentions');
  for (const userId of (notifyOnComments ? mentionIds : [])) {
    await notifyUser(userId, {
      text: `${req.user.name} mentioned you on "${task.title}"`,
      projectId: task.projectId, taskId: task.id, icon: 'i-message', color: 'var(--cat-5)', urgent: true,
    });
  }
  // Let the task's assignee know about new activity too, if they didn't write it and weren't already mentioned.
  if (notifyOnComments && task.assigneeId && task.assigneeId !== req.user.id && !mentionIds.includes(task.assigneeId)) {
    await notifyUser(task.assigneeId, {
      text: `${req.user.name} commented on "${task.title}"`,
      projectId: task.projectId, taskId: task.id, icon: 'i-message', color: 'var(--cat-5)',
    });
  }

  res.json({ comment: commentOut(comment) });
});

router.patch('/:id', requireAuth, async (req, res) => {
  const existing = await prisma.comment.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Comment not found' });
  if (existing.authorId !== req.user.id && !(await isAdmin(req.user, await workspaceIdForTask(existing.taskId)))) {
    return res.status(403).json({ error: 'You can only edit your own comments' });
  }
  const { body } = req.body;
  if (!body || !body.trim()) return res.status(400).json({ error: 'Comment body is required' });

  const users = await prisma.user.findMany();
  const mentionIds = extractMentions(body, users).filter((id) => id !== existing.authorId);

  const comment = await prisma.comment.update({
    where: { id: existing.id },
    data: { body: body.trim(), mentionsJson: JSON.stringify(mentionIds), editedAt: new Date() },
  });
  await logAudit(req.user.id, 'edit_comment', 'task', existing.taskId, { commentId: comment.id }, await workspaceIdForTask(existing.taskId));
  res.json({ comment: commentOut(comment) });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const existing = await prisma.comment.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Comment not found' });
  if (existing.authorId !== req.user.id && !(await isAdmin(req.user, await workspaceIdForTask(existing.taskId)))) {
    return res.status(403).json({ error: 'You can only delete your own comments' });
  }
  await prisma.comment.delete({ where: { id: existing.id } });
  await logAudit(req.user.id, 'delete_comment', 'task', existing.taskId, { commentId: existing.id }, await workspaceIdForTask(existing.taskId));
  res.json({ ok: true });
});

export default router;
