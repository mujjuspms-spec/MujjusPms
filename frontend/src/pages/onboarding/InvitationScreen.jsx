import { useState } from 'react';
import OnboardingLayout from './OnboardingLayout';
import { useWorkspace } from '../../hooks/useWorkspace';

const ROLE_LABEL = { ADMIN: 'Admin', MEMBER: 'Member', VIEWER: 'Viewer' };

export default function InvitationScreen() {
  const { pendingInvitations, joinInvitation, declineInvitation, refreshMemberships } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const invite = pendingInvitations[0];

  if (!invite) return null;

  async function join() {
    setBusy(true); setErr(null);
    try { await joinInvitation(invite.token); } catch (e) { setErr(e.message); setBusy(false); }
  }
  async function decline() {
    setBusy(true); setErr(null);
    try { await declineInvitation(invite.token); await refreshMemberships(); } catch (e) { setErr(e.message); setBusy(false); }
  }

  return (
    <OnboardingLayout title="You've been invited">
      {err && <div style={{ background: 'color-mix(in srgb, var(--status-critical) 12%, transparent)', color: 'var(--status-critical)', fontSize: 12.5, padding: '8px 11px', borderRadius: 8, marginBottom: 14 }}>{err}</div>}
      <p style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>{invite.workspace.name}</p>
      <p style={{ fontSize: 13, color: 'var(--ink-secondary)', marginBottom: 22 }}>
        You've been invited to join this workspace as a <b>{ROLE_LABEL[invite.role]}</b>.
      </p>
      <button className="btn btn-primary" style={{ width: '100%', marginBottom: 10 }} disabled={busy} onClick={join}>
        {busy ? 'Joining…' : 'Join Workspace'}
      </button>
      <button className="btn btn-secondary" style={{ width: '100%' }} disabled={busy} onClick={decline}>Decline</button>
    </OnboardingLayout>
  );
}
