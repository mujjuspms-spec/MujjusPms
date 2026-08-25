import { Router } from 'express';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../lib/auth.js';
import { requireWorkspaceRole, isLastAdmin } from '../lib/permissions.js';
import { logAudit } from '../lib/audit.js';
import { broadcast } from '../lib/sse.js';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function slugify(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'workspace';
}

async function uniqueSlug(name) {
  const base = slugify(name);
  let slug = base;
  let n = 1;
  while (await prisma.workspace.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

function workspaceOut(w) {
  return {
    id: w.id, name: w.name, slug: w.slug, timezone: w.timezone,
    logoUrl: w.logoUrl ? `/api/workspaces/${w.id}/settings/logo` : null,
    onboardingStep: w.onboardingStep, isArchived: w.isArchived,
  };
}

// Verifies the caller belongs to :id (used by the /:id/... member/invite/
// onboarding routes below, distinct from requireWorkspaceContext's header-
// based lookup since the workspace here comes from the URL itself).
async function loadMembership(req, res, next) {
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: req.params.id, userId: req.user.id } },
  });
  if (!membership || membership.status !== 'ACTIVE') return res.status(403).json({ error: 'Not a member of this workspace' });
  req.workspaceId = req.params.id;
  req.workspaceRole = membership.role;
  next();
}

// A brand-new workspace, with the creator as its Admin — the only way a
// workspace ever gets created. role is never accepted from the client.
router.post('/', requireAuth, async (req, res) => {
  const { name, timezone = 'UTC' } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  const slug = await uniqueSlug(name);

  const workspace = await prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: { name: name.trim(), slug, timezone, createdBy: req.user.id, onboardingStep: 'invite' },
    });
    await tx.workspaceMember.create({
      data: { workspaceId: workspace.id, userId: req.user.id, role: 'ADMIN', status: 'ACTIVE' },
    });
    return workspace;
  });
  await logAudit(req.user.id, 'create', 'workspace', workspace.id, { name: workspace.name }, workspace.id);
  res.status(201).json({ workspace: workspaceOut(workspace), role: 'ADMIN' });
});

router.get('/mine', requireAuth, async (req, res) => {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: req.user.id, status: 'ACTIVE' },
    include: { workspace: true },
  });
  res.json({
    memberships: memberships.map((m) => ({ workspace: workspaceOut(m.workspace), role: m.role, status: m.status })),
  });
});

router.get('/invitations/pending', requireAuth, async (req, res) => {
  const pending = await prisma.workspaceInvitation.findMany({
    where: { email: req.user.email.toLowerCase(), status: 'PENDING', expiresAt: { gt: new Date() } },
    include: { workspace: true },
  });
  res.json({
    invitations: pending.map((i) => ({ token: i.token, role: i.role, workspace: workspaceOut(i.workspace) })),
  });
});

router.post('/invitations/:token/accept', requireAuth, async (req, res) => {
  const invitation = await prisma.workspaceInvitation.findUnique({ where: { token: req.params.token } });
  if (!invitation || invitation.status !== 'PENDING' || invitation.expiresAt < new Date()) {
    return res.status(404).json({ error: 'This invitation is invalid or has expired' });
  }
  if (invitation.email.toLowerCase() !== req.user.email.toLowerCase()) {
    return res.status(403).json({ error: 'This invitation was sent to a different email address' });
  }

  const workspace = await prisma.$transaction(async (tx) => {
    const existing = await tx.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId: req.user.id } },
    });
    if (existing) {
      await tx.workspaceMember.update({ where: { id: existing.id }, data: { status: 'ACTIVE' } });
    } else {
      await tx.workspaceMember.create({
        data: { workspaceId: invitation.workspaceId, userId: req.user.id, role: invitation.role, status: 'ACTIVE' },
      });
    }
    await tx.workspaceInvitation.update({ where: { id: invitation.id }, data: { status: 'ACCEPTED', acceptedAt: new Date() } });
    return tx.workspace.findUnique({ where: { id: invitation.workspaceId } });
  });
  await logAudit(req.user.id, 'accept_invitation', 'workspace', workspace.id, { role: invitation.role }, workspace.id);
  res.json({ workspace: workspaceOut(workspace), role: invitation.role });
});

router.post('/invitations/:token/decline', requireAuth, async (req, res) => {
  const invitation = await prisma.workspaceInvitation.findUnique({ where: { token: req.params.token } });
  if (!invitation || invitation.status !== 'PENDING') return res.status(404).json({ error: 'This invitation is invalid or has expired' });
  if (invitation.email.toLowerCase() !== req.user.email.toLowerCase()) {
    return res.status(403).json({ error: 'This invitation was sent to a different email address' });
  }
  await prisma.workspaceInvitation.update({ where: { id: invitation.id }, data: { status: 'DECLINED' } });
  res.json({ ok: true });
});

// Accepts either a single `email` or a batch `emails: [...]` — used by the
// Workspace Settings "Invite Member" modal's multi-email textarea. Existing
// PENDING invitations for the same address are skipped, not duplicated.
router.post('/:id/invitations', requireAuth, loadMembership, requireWorkspaceRole('ADMIN'), async (req, res) => {
  const { email, emails, role = 'MEMBER' } = req.body;
  const rawList = Array.isArray(emails) ? emails : email ? [email] : [];
  const normalizedList = [...new Set(rawList.map((e) => (e || '').trim().toLowerCase()).filter(Boolean))];
  if (normalizedList.length === 0) return res.status(400).json({ error: 'At least one email is required' });
  const invalid = normalizedList.filter((e) => !EMAIL_RE.test(e));
  if (invalid.length > 0) return res.status(400).json({ error: `These aren't valid email addresses: ${invalid.join(', ')}` });
  if (!['ADMIN', 'MEMBER', 'VIEWER'].includes(role)) return res.status(400).json({ error: 'role must be ADMIN, MEMBER or VIEWER' });

  const settings = await prisma.workspaceSettings.findUnique({ where: { workspaceId: req.params.id } });
  const allowedDomains = settings ? JSON.parse(settings.allowedEmailDomainsJson || '[]') : [];
  if (allowedDomains.length > 0) {
    const blocked = normalizedList.filter((e) => !allowedDomains.includes(e.split('@')[1]));
    if (blocked.length > 0) return res.status(400).json({ error: `These email domains aren't allowed for this workspace: ${blocked.join(', ')}` });
  }

  const [existingMembers, existingInvites] = await Promise.all([
    prisma.workspaceMember.findMany({ where: { workspaceId: req.params.id, status: 'ACTIVE' }, include: { user: true } }),
    prisma.workspaceInvitation.findMany({ where: { workspaceId: req.params.id, status: 'PENDING', email: { in: normalizedList } } }),
  ]);
  const memberEmails = new Set(existingMembers.map((m) => m.user.email.toLowerCase()));
  const pendingEmails = new Set(existingInvites.map((i) => i.email));

  const toInvite = normalizedList.filter((e) => !memberEmails.has(e) && !pendingEmails.has(e));
  const skipped = normalizedList.filter((e) => memberEmails.has(e) || pendingEmails.has(e));

  const invitations = await Promise.all(toInvite.map((normalizedEmail) => prisma.workspaceInvitation.create({
    data: {
      workspaceId: req.params.id, email: normalizedEmail, role,
      token: nanoid(24), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), invitedBy: req.user.id,
    },
  })));
  for (const inv of invitations) {
    await logAudit(req.user.id, 'invite', 'workspace', req.params.id, { email: inv.email, role }, req.params.id);
  }
  res.status(201).json({
    invitations: invitations.map((i) => ({ token: i.token, email: i.email, role: i.role, expiresAt: i.expiresAt })),
    skipped,
  });
});

router.get('/:id/members', requireAuth, loadMembership, async (req, res) => {
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: req.params.id, status: 'ACTIVE' },
    include: { user: true },
  });
  res.json({
    members: members.map((m) => ({
      userId: m.userId, name: m.user.name, email: m.user.email, role: m.role,
      jobTitle: m.user.role, joinedAt: m.joinedAt, lastLoginAt: m.user.lastLoginAt,
    })),
  });
});

// Any Admin may change any other member's role among ADMIN/MEMBER/VIEWER —
// the only guard is that a workspace must always keep at least one Admin.
router.patch('/:id/members/:userId/role', requireAuth, loadMembership, requireWorkspaceRole('ADMIN'), async (req, res) => {
  const { role } = req.body;
  if (!['ADMIN', 'MEMBER', 'VIEWER'].includes(role)) return res.status(400).json({ error: 'role must be ADMIN, MEMBER or VIEWER' });

  const existing = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: req.params.id, userId: req.params.userId } },
  });
  if (!existing || existing.status !== 'ACTIVE') return res.status(404).json({ error: 'This person is not a member of this workspace' });
  if (existing.role === 'ADMIN' && role !== 'ADMIN' && (await isLastAdmin(req.params.id, req.params.userId))) {
    return res.status(403).json({ error: 'This workspace must have at least one Admin.' });
  }

  const updated = await prisma.workspaceMember.update({ where: { id: existing.id }, data: { role } });
  await logAudit(req.user.id, 'change_workspace_role', 'workspace', req.params.id, { userId: req.params.userId, from: existing.role, to: role }, req.params.id);
  broadcast('workspace.member.role_changed', { workspaceId: req.params.id, userId: req.params.userId, from: existing.role, to: role });
  res.json({ member: updated });
});

// The only recovery path for a member locked out of their account — there's
// no self-service email reset (no such flow exists yet), so an Admin sets a
// new password directly, the same way one is set when a member is first
// created via "Add team member".
router.post('/:id/members/:userId/reset-password', requireAuth, loadMembership, requireWorkspaceRole('ADMIN'), async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });

  const existing = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: req.params.id, userId: req.params.userId } },
  });
  if (!existing || existing.status !== 'ACTIVE') return res.status(404).json({ error: 'This person is not a member of this workspace' });

  await prisma.user.update({
    where: { id: req.params.userId },
    data: { passwordHash: bcrypt.hashSync(newPassword, 8), passwordChangedAt: new Date() },
  });
  await logAudit(req.user.id, 'admin_reset_password', 'user', req.params.userId, {}, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id/members/:userId', requireAuth, loadMembership, requireWorkspaceRole('ADMIN'), async (req, res) => {
  const existing = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: req.params.id, userId: req.params.userId } },
  });
  if (!existing || existing.status !== 'ACTIVE') return res.status(404).json({ error: 'This person is not a member of this workspace' });
  if (existing.role === 'ADMIN' && (await isLastAdmin(req.params.id, req.params.userId))) {
    return res.status(403).json({ error: 'This workspace must have at least one Admin.' });
  }

  await prisma.workspaceMember.update({ where: { id: existing.id }, data: { status: 'REMOVED' } });
  await logAudit(req.user.id, 'remove_workspace_member', 'workspace', req.params.id, { userId: req.params.userId }, req.params.id);
  broadcast('workspace.member.removed', { workspaceId: req.params.id, userId: req.params.userId });
  res.json({ ok: true });
});

router.patch('/:id/onboarding', requireAuth, loadMembership, requireWorkspaceRole('ADMIN'), async (req, res) => {
  const { step } = req.body;
  if (step !== null && !['invite', 'project', 'preferences'].includes(step)) {
    return res.status(400).json({ error: 'Invalid onboarding step' });
  }
  const workspace = await prisma.workspace.update({ where: { id: req.params.id }, data: { onboardingStep: step } });
  res.json({ workspace: workspaceOut(workspace) });
});

export default router;
