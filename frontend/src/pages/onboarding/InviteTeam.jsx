import { useState } from 'react';
import OnboardingLayout from './OnboardingLayout';
import { useWorkspace } from '../../hooks/useWorkspace';
import { sendInvitation } from '../../services/workspaces';

export default function InviteTeam({ onNext }) {
  const { activeWorkspace, advanceOnboarding } = useWorkspace();
  const [rows, setRows] = useState([{ email: '', role: 'MEMBER' }]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  function updateRow(i, patch) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((rs) => [...rs, { email: '', role: 'MEMBER' }]);
  }

  async function send() {
    const valid = rows.filter((r) => r.email.trim());
    setBusy(true); setErr(null);
    try {
      for (const r of valid) await sendInvitation(activeWorkspace.id, r.email.trim(), r.role);
      await advanceOnboarding('project');
      onNext();
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  }

  async function skip() {
    await advanceOnboarding('project');
    onNext();
  }

  return (
    <OnboardingLayout step={2} totalSteps={4} title="Invite your team" subtitle="Bring the people you work with into MujuzPM.">
      {err && <div style={{ background: 'color-mix(in srgb, var(--status-critical) 12%, transparent)', color: 'var(--status-critical)', fontSize: 12.5, padding: '8px 11px', borderRadius: 8, marginBottom: 14 }}>{err}</div>}
      {rows.map((r, i) => (
        <div className="invite-row" key={i}>
          <div className="field">
            {i === 0 && <label>Email</label>}
            <input type="email" value={r.email} onChange={(e) => updateRow(i, { email: e.target.value })} placeholder="teammate@company.com" />
          </div>
          <div className="field">
            {i === 0 && <label>Role</label>}
            <select value={r.role} onChange={(e) => updateRow(i, { role: e.target.value })}>
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
              <option value="VIEWER">Viewer</option>
            </select>
          </div>
        </div>
      ))}
      <button className="btn btn-secondary btn-sm" onClick={addRow} style={{ marginBottom: 18 }}>+ Add another</button>
      <button className="btn btn-primary" style={{ width: '100%', marginBottom: 10 }} disabled={busy} onClick={send}>
        {busy ? 'Sending…' : 'Send Invitations'}
      </button>
      <button className="btn btn-secondary" style={{ width: '100%' }} disabled={busy} onClick={skip}>Skip for now</button>
    </OnboardingLayout>
  );
}
