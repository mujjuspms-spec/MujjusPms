import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../lib/auth.js';
import { requireWorkspaceContext, requireWorkspaceRole } from '../lib/permissions.js';
import { auditOut } from '../lib/serialize.js';

const router = Router();

router.get('/', requireAuth, requireWorkspaceContext, requireWorkspaceRole('ADMIN'), async (req, res) => {
  const limit = Math.min(500, Number(req.query.limit) || 200);
  const { userId, action, from, to } = req.query;
  const where = { workspaceId: req.workspaceId };
  if (userId) where.actorId = userId;
  if (action) where.action = action;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }
  const entries = await prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit });
  res.json({ entries: entries.map(auditOut) });
});

export default router;
