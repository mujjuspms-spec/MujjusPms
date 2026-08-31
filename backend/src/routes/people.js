import { Router } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { nanoid } from 'nanoid';
import { prisma } from '../lib/prisma.js';
import { requireAuth, publicUser } from '../lib/auth.js';
import { requireWorkspaceContext, requireWorkspaceRole } from '../lib/permissions.js';
import { logAudit } from '../lib/audit.js';
import { supabase } from '../lib/supabase.js';
import { notifyUser } from '../lib/notify.js';
import { sendExistingUserInviteEmail, sendNewUserSignupInviteEmail } from '../lib/resend.js';

const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
});

const router = Router();

// Workspace-scoped roster — only people who are ACTIVE members of the
// caller's active workspace, never every User row in the database.
router.get('/', requireAuth, requireWorkspaceContext, async (req, res) => {
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: req.workspaceId, status: 'ACTIVE' },
    include: { user: true },
  });
  res.json({ people: members.map((m) => publicUser(m.user)) });
});

// Sends invitation(s) for a person to join this workspace — scoped to
// specific projects when given, or workspace-only when not. NEVER creates
// a User or a password here: this app's only real auth is Supabase, and a
// User row created directly here would have no matching Supabase Auth
// account and could never actually log in. The invitee either accepts
// (existing account, see workspaces.js's /invitations/:token/accept) or
// signs up themselves (new account, see auth.js's invite-aware
// auto-provision block) to gain access.
const WORKSPACE_ROLES = ['ADMIN', 'MEMBER', 'VIEWER'];

router.post('/', requireAuth, requireWorkspaceContext, requireWorkspaceRole('ADMIN'), async (req, res) => {
  const { name, email, workspaceRole = 'MEMBER', projectIds = [] } = req.body;
  if (!name?.trim() || !email?.trim()) return res.status(400).json({ error: 'name and email are required' });
  if (!WORKSPACE_ROLES.includes(workspaceRole)) return res.status(400).json({ error: 'Invalid workspace role' });
  const normalizedEmail = email.trim().toLowerCase();

  const projects = projectIds.length
    ? await prisma.project.findMany({ where: { id: { in: projectIds }, workspaceId: req.workspaceId } })
    : [];
  if (projectIds.length && projects.length !== projectIds.length) {
    return res.status(400).json({ error: 'One or more selected projects were not found in this workspace' });
  }
  // null = a plain workspace-only invite (today's only behavior when no
  // projects are selected); otherwise one invitation per selected project.
  const scopes = projects.length ? projects : [null];

  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  const existingMembership = existingUser
    ? await prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: req.workspaceId, userId: existingUser.id } } })
    : null;
  if (existingMembership?.status === 'ACTIVE' && scopes.length === 1 && scopes[0] === null) {
    return res.status(409).json({ error: 'This user is already a member of this workspace' });
  }

  const workspace = await prisma.workspace.findUnique({ where: { id: req.workspaceId } });
  const origin = `${req.protocol}://${req.get('host')}`;
  const created = [];
  const skipped = [];

  for (const project of scopes) {
    if (existingUser && existingMembership?.status === 'ACTIVE' && project) {
      const pm = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId: project.id, userId: existingUser.id } } });
      if (pm) { skipped.push({ projectId: project.id, projectName: project.name, reason: 'This user is already a member of this project' }); continue; }
    }
    const dup = await prisma.workspaceInvitation.findFirst({
      where: { workspaceId: req.workspaceId, email: normalizedEmail, projectId: project?.id ?? null, status: 'PENDING' },
    });
    if (dup) { skipped.push({ projectId: project?.id ?? null, projectName: project?.name ?? null, reason: 'An invitation is already pending' }); continue; }

    const invitation = await prisma.workspaceInvitation.create({
      data: {
        workspaceId: req.workspaceId, projectId: project?.id ?? null, email: normalizedEmail, name: name.trim(),
        role: workspaceRole, token: nanoid(24), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        invitedBy: req.user.id,
      },
    });
    created.push(invitation);

    if (existingUser) {
      await notifyUser(existingUser.id, {
        text: project ? `You were invited to join ${project.name}` : `You were invited to join ${workspace.name}`,
        projectId: project?.id ?? null, icon: 'i-users', color: 'var(--brand-500)',
        invitationId: invitation.id,
      });
      await sendExistingUserInviteEmail({
        to: normalizedEmail, inviterName: req.user.name, workspaceName: workspace.name,
        projectName: project?.name ?? null, role: workspaceRole,
      }).catch((e) => console.error('[people] invite email failed', e));
    } else {
      await sendNewUserSignupInviteEmail({
        to: normalizedEmail, inviterName: req.user.name, workspaceName: workspace.name,
        projectName: project?.name ?? null, role: workspaceRole, token: invitation.token, origin,
      }).catch((e) => console.error('[people] signup-invite email failed', e));
    }
  }

  if (created.length === 0) {
    return res.status(409).json({ error: 'No new invitations were created', skipped });
  }
  await logAudit(req.user.id, 'invite', 'workspace', req.workspaceId, { email: normalizedEmail, role: workspaceRole, projectIds: created.map((i) => i.projectId) }, req.workspaceId);
  res.status(201).json({
    invitations: created.map((i) => ({ token: i.token, projectId: i.projectId, role: i.role })),
    skipped, existingUser: !!existingUser,
  });
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
