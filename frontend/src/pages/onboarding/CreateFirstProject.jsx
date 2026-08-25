import { useState } from 'react';
import OnboardingLayout from './OnboardingLayout';
import { useWorkspace } from '../../hooks/useWorkspace';
import { createProject } from '../../services/projects';

const HEALTHS = [
  { value: 'good', label: 'On track' },
  { value: 'warning', label: 'At risk' },
  { value: 'critical', label: 'Critical' },
];

export default function CreateFirstProject({ onNext }) {
  const { advanceOnboarding } = useWorkspace();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [start, setStart] = useState('');
  const [due, setDue] = useState('');
  const [health, setHealth] = useState('good');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function submit() {
    if (!name.trim()) { setErr('Project name is required.'); return; }
    setBusy(true); setErr(null);
    try {
      await createProject({
        name: name.trim(), desc: desc.trim(), start: start || 'Unscheduled', due: due || 'Unscheduled', health,
      });
      await advanceOnboarding('preferences');
      onNext();
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  }

  async function skip() {
    await advanceOnboarding('preferences');
    onNext();
  }

  return (
    <OnboardingLayout step={3} totalSteps={4} title="Create your first project" subtitle="Give your team something to work on right away.">
      {err && <div style={{ background: 'color-mix(in srgb, var(--status-critical) 12%, transparent)', color: 'var(--status-critical)', fontSize: 12.5, padding: '8px 11px', borderRadius: 8, marginBottom: 14 }}>{err}</div>}
      <div className="field">
        <label>Project name</label>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Website Relaunch" />
      </div>
      <div className="field">
        <label>Description (optional)</label>
        <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What's this project about?" />
      </div>
      <div className="flex gap-12">
        <div className="field grow">
          <label>Start date</label>
          <input value={start} onChange={(e) => setStart(e.target.value)} placeholder="e.g. 1 Sep 2026" />
        </div>
        <div className="field grow">
          <label>Target date</label>
          <input value={due} onChange={(e) => setDue(e.target.value)} placeholder="e.g. 30 Nov 2026" />
        </div>
      </div>
      <div className="field">
        <label>Project health</label>
        <select value={health} onChange={(e) => setHealth(e.target.value)}>
          {HEALTHS.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
        </select>
      </div>
      <button className="btn btn-primary" style={{ width: '100%', marginTop: 6, marginBottom: 10 }} disabled={busy || !name.trim()} onClick={submit}>
        {busy ? 'Creating…' : 'Create Project'}
      </button>
      <button className="btn btn-secondary" style={{ width: '100%' }} disabled={busy} onClick={skip}>Skip for now</button>
    </OnboardingLayout>
  );
}
