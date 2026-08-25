import { useState } from 'react';
import Modal from './Modal';
import { useWorkspace } from '../hooks/useWorkspace';

// Common IANA zones — a short, real list (not a fake picker) covering the
// regions this app's seeded workspaces actually use plus the usual majors.
const TIMEZONES = [
  'UTC', 'Asia/Riyadh', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Karachi', 'Asia/Singapore',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'America/New_York', 'America/Chicago',
  'America/Denver', 'America/Los_Angeles', 'Africa/Cairo', 'Australia/Sydney',
];

// Mirrors the backend's slugify() in workspaces.js — display-only preview;
// the server remains the sole source of truth and dedupes the real slug.
function slugPreview(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || '…';
}

export default function CreateWorkspaceModal({ onClose }) {
  const { createWorkspace } = useWorkspace();
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!name.trim() || busy) return;
    setBusy(true); setError('');
    try {
      await createWorkspace({ name: name.trim(), timezone });
      onClose();
    } catch (e) {
      setError(e.message || 'Could not create this workspace');
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Create new workspace" onClose={onClose} busy={busy} width={520}
      footer={<>
        <button className="btn btn-secondary btn-sm" disabled={busy} onClick={onClose}>Cancel</button>
        <button className="btn btn-primary btn-sm" disabled={!name.trim() || busy} onClick={submit}>
          {busy ? 'Creating…' : 'Create Workspace'}
        </button>
      </>}
    >
      <p style={{ fontSize: 12.5, color: 'var(--ink-muted)', marginTop: -2, marginBottom: 14 }}>
        You'll become an Admin of this new workspace. Your role in other workspaces stays unchanged.
      </p>
      <div className="field">
        <label>Workspace name *</label>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ahmed Consulting" onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
      </div>
      {name.trim() && (
        <p style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: -8, marginBottom: 14 }}>
          Workspace URL: mujuzpm.com/{slugPreview(name)}
        </p>
      )}
      <div className="field">
        <label>Time zone *</label>
        <select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
          {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
        </select>
      </div>
      {error && <p style={{ fontSize: 12.5, color: 'var(--status-critical)' }}>{error}</p>}
    </Modal>
  );
}
