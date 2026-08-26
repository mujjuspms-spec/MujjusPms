import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, publicUser } from '../lib/auth.js';
import { requireGlobalAdmin } from '../lib/permissions.js';

const router = Router();

router.use(requireAuth);
router.use(requireGlobalAdmin);

router.get('/users', async (req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { lastLoginAt: 'desc' },
  });
  res.json({ users: users.map(publicUser).map(u => ({ ...u, approvalStatus: users.find(x => x.id === u.id).approvalStatus, email: users.find(x => x.id === u.id).email })) });
});

router.post('/users/:id/approve', async (req, res) => {
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      approvalStatus: 'APPROVED',
      approvedAt: new Date(),
      rejectedAt: null
    }
  });
  res.json({ user: { ...publicUser(user), approvalStatus: user.approvalStatus, email: user.email } });
});

router.post('/users/:id/reject', async (req, res) => {
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      approvalStatus: 'REJECTED',
      rejectedAt: new Date(),
    }
  });
  res.json({ user: { ...publicUser(user), approvalStatus: user.approvalStatus, email: user.email } });
});

export default router;
