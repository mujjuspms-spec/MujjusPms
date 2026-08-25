import { useState } from 'react';
import OnboardingLayout from './OnboardingLayout';
import { useWorkspace } from '../../hooks/useWorkspace';

const ROLE_LABEL = { ADMIN: 'Admin', MEMBER: 'Member', VIEWER: 'Viewer' };

export default function ChooserScreen() {
  const { pendingInvitations, joinInvitation } = useWorkspace();
  const [busyToken, setBusyToken] = useState(null);
  const [err, setErr] = useState(null);

  async function join(token) {
    setBusyToken(token); setErr(null);
    try { await joinInvitation(token); } catch (e) { setErr(e.message); setBusyToken(null); }
  }

  return (
    <OnboardingLayout title="Choose a workspace to join" subtitle="You've been invited to more than one workspace.">
      {err && <div style={{ background: 'color-mix(in srgb, var(--status-critical) 12%, transparent)', color: 'var(--status-critical)', fontSize: 12.5, padding: '8px 11px', borderRadius: 8, marginBottom: 14 }}>{err}</div>}
      {pendingInvitations.map((invite) => (
        <div key={invite.token} className="flex items-center justify-between" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: 10 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{invite.workspace.name}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{ROLE_LABEL[invite.role]}</div>
          </div>
          <button className="btn btn-primary btn-sm" disabled={!!busyToken} onClick={() => join(invite.token)}>
            {busyToken === invite.token ? 'Joining…' : 'Join'}
          </button>
        </div>
      ))}
    </OnboardingLayout>
  );
}
