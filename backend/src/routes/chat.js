import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../lib/auth.js';
import { canAccessProject } from '../lib/permissions.js';
import { broadcast } from '../lib/sse.js';
import { chatMessageOut } from '../lib/serialize.js';

const router = Router();

// Chat is gated to users with project access (admin or a member/viewer of
// this specific project) — unlike the rest of the app's now-restricted
// read model, this was already access-checked; it just shares the same
// centralized check as everything else now.
router.get('/', requireAuth, async (req, res) => {
  if (!req.query.projectId) return res.status(400).json({ error: 'projectId is required' });
  if (!(await canAccessProject(req.user, req.query.projectId))) return res.status(403).json({ error: 'You do not have access to this project' });
  const rows = await prisma.chatMessage.findMany({
    where: { projectId: req.query.projectId }, orderBy: { createdAt: 'asc' }, take: 200,
  });
  res.json({ messages: rows.map(chatMessageOut) });
});

router.post('/', requireAuth, async (req, res) => {
  const { projectId, body } = req.body;
  if (!projectId || !body?.trim()) return res.status(400).json({ error: 'projectId and body are required' });
  if (!(await canAccessProject(req.user, projectId))) return res.status(403).json({ error: 'You do not have access to this project' });

  const message = await prisma.chatMessage.create({ data: { projectId, authorId: req.user.id, body: body.trim() } });
  broadcast('chat.message', chatMessageOut(message));
  res.status(201).json({ message: chatMessageOut(message) });
});

export default router;
