import { apiFetch, getActiveWorkspaceId, setActiveWorkspaceId } from './api';

// Populated by resolveWorkspace() after login — the current user's
// workspace memberships. Same stable-array-reference pattern as PEOPLE/
// PROJECTS so any component importing it directly stays in sync.
export const MEMBERSHIPS = [];

export { getActiveWorkspaceId, setActiveWorkspaceId };

export function clearWorkspaceState() {
  setActiveWorkspaceId(null);
  MEMBERSHIPS.length = 0;
}

export function fetchMyMemberships() {
  return apiFetch('/api/workspaces/mine').then(({ memberships }) => {
    MEMBERSHIPS.length = 0;
    MEMBERSHIPS.push(...memberships);
    return MEMBERSHIPS;
  });
}

export function fetchPendingInvitations() {
  return apiFetch('/api/workspaces/invitations/pending').then((r) => r.invitations);
}

// Public — works with or without a session, for the signup screen to show
// invitation context before the invitee has an account.
export function peekInvitation(token) {
  return apiFetch(`/api/workspaces/invitations/${token}/peek`);
}

export function createWorkspace(payload) {
  return apiFetch('/api/workspaces', { method: 'POST', body: JSON.stringify(payload) });
}

export function acceptInvitation(token) {
  return apiFetch(`/api/workspaces/invitations/${token}/accept`, { method: 'POST' });
}

export function declineInvitation(token) {
  return apiFetch(`/api/workspaces/invitations/${token}/decline`, { method: 'POST' });
}

export function sendInvitation(workspaceId, email, role) {
  return apiFetch(`/api/workspaces/${workspaceId}/invitations`, { method: 'POST', body: JSON.stringify({ email, role }) });
}

// Batch form — used by the Members & Permissions "Invite Member" modal's
// multi-email textarea. Returns { invitations, skipped } — skipped entries
// were already a member or already had a pending invitation.
export function sendInvitations(workspaceId, emails, role) {
  return apiFetch(`/api/workspaces/${workspaceId}/invitations`, { method: 'POST', body: JSON.stringify({ emails, role }) });
}

export function fetchWorkspaceMembers(workspaceId) {
  return apiFetch(`/api/workspaces/${workspaceId}/members`).then((r) => r.members);
}

export function fetchWorkspaceInvitations(workspaceId) {
  return apiFetch(`/api/workspaces/${workspaceId}/invitations`).then((r) => r.invitations);
}

export function resendInvitation(workspaceId, invitationId) {
  return apiFetch(`/api/workspaces/${workspaceId}/invitations/${invitationId}/resend`, { method: 'POST' });
}

export function cancelInvitation(workspaceId, invitationId) {
  return apiFetch(`/api/workspaces/${workspaceId}/invitations/${invitationId}`, { method: 'DELETE' });
}

export function changeWorkspaceMemberRole(workspaceId, userId, role) {
  return apiFetch(`/api/workspaces/${workspaceId}/members/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
}

export function removeWorkspaceMember(workspaceId, userId) {
  return apiFetch(`/api/workspaces/${workspaceId}/members/${userId}`, { method: 'DELETE' });
}

export function resetMemberPassword(workspaceId, userId, newPassword) {
  return apiFetch(`/api/workspaces/${workspaceId}/members/${userId}/reset-password`, { method: 'POST', body: JSON.stringify({ newPassword }) });
}

export function setOnboardingStep(workspaceId, step) {
  return apiFetch(`/api/workspaces/${workspaceId}/onboarding`, { method: 'PATCH', body: JSON.stringify({ step }) });
}
