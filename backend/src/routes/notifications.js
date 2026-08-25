import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../lib/auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const notifications = await prisma.notification.findMany({ where: { userId: req.user.id }, orderBy: { time: 'desc' } });
  res.json({ notifications });
});

router.patch('/:id/read', requireAuth, async (req, res) => {
  const n = await prisma.notification.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!n) return res.status(404).json({ error: 'Not found' });
  const updated = await prisma.notification.update({ where: { id: n.id }, data: { unread: false } });
  res.json({ notification: updated });
});

export default router;
