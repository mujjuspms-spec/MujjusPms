import { useState } from 'react';
import OnboardingLayout from './OnboardingLayout';
import { useWorkspace } from '../../hooks/useWorkspace';

const TIMEZONES = [
  'Asia/Riyadh', 'Asia/Dubai', 'Asia/Karachi', 'Asia/Kolkata', 'Europe/London',
  'Europe/Berlin', 'America/New_York', 'America/Los_Angeles', 'UTC',
];

function slugPreview(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || '…';
}

export default function CreateWorkspace() {
  const { createWorkspace } = useWorkspace();
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('Asia/Riyadh');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function submit() {
    if (!name.trim()) { setErr('Workspace name is required.'); return; }
    setBusy(true); setErr(null);
    try {
      await createWorkspace({ name: name.trim(), timezone });
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <OnboardingLayout title="Welcome to MujuzPM" subtitle="Let's create your workspace.">
      {err && <div style={{ background: 'color-mix(in srgb, var(--status-critical) 12%, transparent)', color: 'var(--status-critical)', fontSize: 12.5, padding: '8px 11px', borderRadius: 8, marginBottom: 14 }}>{err}</div>}
      <div className="field">
        <label>Workspace name</label>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme Technologies" maxLength={80} />
      </div>
      <p style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: -10, marginBottom: 16 }}>
        mujuzpm.com/{slugPreview(name)}
      </p>
      <div className="field">
        <label>Time zone</label>
        <select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
          {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
        </select>
      </div>
      <button className="btn btn-primary" style={{ width: '100%', marginTop: 6 }} disabled={busy || !name.trim()} onClick={submit}>
        {busy ? 'Creating…' : 'Create Workspace'}
      </button>
    </OnboardingLayout>
  );
}
