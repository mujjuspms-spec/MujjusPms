import { prisma } from './prisma.js';
import { supabase } from './supabase.js';
import { sendAdminApprovalNotification } from './resend.js';
import { logAudit } from './audit.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = (header.startsWith('Bearer ') ? header.slice(7) : null) || req.query.token || null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const { data: { user: supaUser }, error } = await supabase.auth.getUser(token);
    if (error || !supaUser) return res.status(401).json({ error: 'Invalid or expired token' });

    let user = await prisma.user.findUnique({ where: { id: supaUser.id } });

    if (!user) {
      const email = supaUser.email?.toLowerCase();
      if (!email) return res.status(400).json({ error: 'Email required' });

      const name = supaUser.user_metadata?.name || email.split('@')[0];
      const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

      const adminEmail = process.env.ADMIN_APPROVAL_EMAIL?.toLowerCase();
      const isGlobalAdmin = email === adminEmail;

      // A workspace Admin already vetted this person by inviting them —
      // the global approval gate below is redundant for them. Prefer the
      // exact invitation this signup came through (threaded via Supabase
      // user_metadata at signUp time, see useAuth.jsx's register()); fall
      // back to the oldest still-pending invite for their email so links
      // sent before that plumbing existed (or OAuth signups) still work.
      const inviteToken = supaUser.user_metadata?.inviteToken || null;
      let invitation = inviteToken
        ? await prisma.workspaceInvitation.findUnique({ where: { token: inviteToken } })
        : null;
      if (invitation && (invitation.status !== 'PENDING' || invitation.expiresAt < new Date() || invitation.email.toLowerCase() !== email)) {
        invitation = null;
      }
      if (!invitation) {
        invitation = await prisma.workspaceInvitation.findFirst({
          where: { email, status: 'PENDING', expiresAt: { gt: new Date() } },
          orderBy: { createdAt: 'asc' },
        });
      }
      const bypassApprovalGate = isGlobalAdmin || !!invitation;

      user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            id: supaUser.id,
            name,
            email,
            role: '',
            globalRole: isGlobalAdmin ? 'admin' : 'member',
            approvalStatus: bypassApprovalGate ? 'APPROVED' : 'PENDING',
            approvedAt: bypassApprovalGate ? new Date() : null,
            color: 'var(--cat-1)',
            initials,
            passwordHash: '',
            capacity: 40,
            allocated: 0,
          },
        });

        if (invitation) {
          const existingMembership = await tx.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId: newUser.id } },
          });
          if (existingMembership) {
            if (existingMembership.status !== 'ACTIVE') {
              await tx.workspaceMember.update({ where: { id: existingMembership.id }, data: { status: 'ACTIVE' } });
            }
          } else {
            await tx.workspaceMember.create({
              data: { workspaceId: invitation.workspaceId, userId: newUser.id, role: invitation.role, status: 'ACTIVE' },
            });
          }
          if (invitation.projectId) {
            const existingPM = await tx.projectMember.findUnique({
              where: { projectId_userId: { projectId: invitation.projectId, userId: newUser.id } },
            });
            if (!existingPM) {
              await tx.projectMember.create({ data: { projectId: invitation.projectId, userId: newUser.id } });
            }
          }
          await tx.workspaceInvitation.update({
            where: { id: invitation.id },
            data: { status: 'ACCEPTED', acceptedAt: new Date(), inviteeUserId: newUser.id },
          });
        }

        return newUser;
      });

      if (invitation) {
        await logAudit(user.id, 'accept_invitation', 'workspace', invitation.workspaceId, { role: invitation.role, projectId: invitation.projectId, viaSignup: true }, invitation.workspaceId);
      } else if (!isGlobalAdmin) {
        sendAdminApprovalNotification(user).catch(err => console.error(err));
      }
    }

    if (user.approvalStatus === 'PENDING') {
      return res.status(403).json({ error: 'Your account is awaiting administrator approval.' });
    }
    if (user.approvalStatus === 'REJECTED') {
      return res.status(403).json({ error: 'Your registration has been rejected.' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

export function publicUser(u) {
  if (!u) return null;
  const { passwordHash, avatarStoredName, ...rest } = u;
  return { ...rest, avatarUrl: avatarStoredName ? `/api/people/${u.id}/avatar` : null };
}

export function signToken(user) {
  return '';
}
