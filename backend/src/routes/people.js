import { Router } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { nanoid } from 'nanoid';
import { prisma } from '../lib/prisma.js';
import { requireAuth, publicUser } from '../lib/auth.js';
import { requireWorkspaceContext, requireWorkspaceRole } from '../lib/permissions.js';
import { logAudit } from '../lib/audit.js';
import { supabase } from '../lib/supabase.js';

const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
});

const router = Router();
const AVATAR_COLORS = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)', 'var(--cat-6)', 'var(--cat-7)', 'var(--cat-8)'];

// Workspace-scoped roster — only people who are ACTIVE members of the
// caller's active workspace, never every User row in the database.
router.get('/', requireAuth, requireWorkspaceContext, async (req, res) => {
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: req.workspaceId, status: 'ACTIVE' },
    include: { user: true },
  });
  res.json({ people: members.map((m) => publicUser(m.user)) });
});

// Provisions a brand-new person directly into this workspace — distinct
// from /api/auth/register (self-signup, which logs the caller in as the
// new account and creates no workspace membership at all) since here an
// admin is adding someone else, into their own workspace, while staying
// signed in as themselves.
const WORKSPACE_ROLES = ['ADMIN', 'MEMBER', 'VIEWER'];

router.post('/', requireAuth, requireWorkspaceContext, requireWorkspaceRole('ADMIN'), async (req, res) => {
  const { name, email, role = '', workspaceRole = 'MEMBER', password } = req.body;
  if (!name?.trim() || !email?.trim()) return res.status(400).json({ error: 'name and email are required' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'A password of at least 6 characters is required' });
  if (!WORKSPACE_ROLES.includes(workspaceRole)) return res.status(400).json({ error: 'Invalid workspace role' });

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) return res.status(409).json({ error: 'An account with this email already exists' });

  const { user } = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        id: nanoid(8), name: name.trim(), email: normalizedEmail, role: role.trim(), globalRole: 'member',
        color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
        initials: name.trim().split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase(),
        passwordHash: bcrypt.hashSync(password, 8), capacity: 40, allocated: 0,
      },
    });
    await tx.workspaceMember.create({
      data: { workspaceId: req.workspaceId, userId: user.id, role: workspaceRole, status: 'ACTIVE' },
    });
    return { user };
  });
  await logAudit(req.user.id, 'create', 'user', user.id, { name: user.name, email: user.email }, req.workspaceId);
  res.json({ person: publicUser(user) });
});

router.get('/:id/avatar', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user?.avatarStoredName) return res.status(404).json({ error: 'No avatar set' });
  
  const { data, error } = await supabase.storage
    .from('attachments')
    .createSignedUrl(user.avatarStoredName, 60);
    
  if (error || !data?.signedUrl) return res.status(500).json({ error: 'Failed to get avatar link' });
  res.redirect(data.signedUrl);
});

router.post('/me/avatar', requireAuth, uploadAvatar.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Choose an image file (5MB max)' });

  const storedName = `avatar-${nanoid(10)}__${req.file.originalname}`;
  
  const { error } = await supabase.storage
    .from('attachments')
    .upload(storedName, req.file.buffer, { contentType: req.file.mimetype });
    
  if (error) return res.status(500).json({ error: 'Upload failed' });

  const previous = req.user.avatarStoredName;
  const user = await prisma.user.update({ where: { id: req.user.id }, data: { avatarStoredName: storedName } });
  
  if (previous) {
    await supabase.storage.from('attachments').remove([previous]);
  }
  
  await logAudit(req.user.id, 'update_avatar', 'user', req.user.id, {});
  res.json({ user: publicUser(user) });
});

router.delete('/me/avatar', requireAuth, async (req, res) => {
  if (req.user.avatarStoredName) {
    await supabase.storage.from('attachments').remove([req.user.avatarStoredName]);
  }
  const user = await prisma.user.update({ where: { id: req.user.id }, data: { avatarStoredName: null } });
  await logAudit(req.user.id, 'remove_avatar', 'user', req.user.id, {});
  res.json({ user: publicUser(user) });
});

router.post('/me/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!bcrypt.compareSync(currentPassword || '', req.user.passwordHash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { passwordHash: bcrypt.hashSync(newPassword, 8), passwordChangedAt: new Date() },
  });
  await logAudit(req.user.id, 'change_password', 'user', req.user.id, {});
  res.json({ ok: true, user: publicUser(user) });
});

export default router;
