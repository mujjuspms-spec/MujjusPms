import { useState } from 'react';
import { formatMinutes } from '../utils/format';

// Click-to-edit estimated hours — same pattern as EditableMoney, but stores
// and emits minutes (draft is entered in hours, e.g. "2.5", converted on
// commit) so estimates never drift from float rounding.
export default function EditableHours({ value, onSave, placeholder = 'Not set', readOnly = false }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value != null ? String(value / 60) : '');
  const [error, setError] = useState('');

  function commit() {
    if (draft === '') {
      setEditing(false);
      setError('');
      if (value !== null) onSave(null);
      return;
    }
    const hours = Number(draft);
    if (!Number.isFinite(hours) || hours < 0) {
      setError('Enter 0 or a positive number of hours');
      return;
    }
    const minutes = Math.round(hours * 60);
    setEditing(false);
    setError('');
    if (minutes !== value) onSave(minutes);
  }

  if (editing) {
    return (
      <span className="col" style={{ alignItems: 'flex-end' }}>
        <span className="flex items-center gap-4" style={{ border: '1px solid var(--brand-500)', borderRadius: 6, background: 'var(--surface-2)', padding: '2px 8px 2px 2px' }}>
          <input
            autoFocus type="number" min="0" step="0.25" value={draft} onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setEditing(false); setError(''); } }}
            style={{ width: 70, fontSize: 12.5, border: 0, borderRadius: 4, padding: '3px 5px', background: 'transparent', color: 'var(--ink-primary)', outline: 0 }}
          />
          <span style={{ fontSize: 10.5, color: 'var(--ink-muted)', fontWeight: 700 }}>hours</span>
        </span>
        {error && <span style={{ fontSize: 10.5, color: 'var(--status-critical)', marginTop: 2 }}>{error}</span>}
      </span>
    );
  }

  return (
    <span
      onClick={readOnly ? undefined : () => { setDraft(value != null ? String(value / 60) : ''); setEditing(true); }}
      title={readOnly ? undefined : 'Click to edit'}
      style={{ cursor: readOnly ? 'default' : 'pointer', borderBottom: readOnly ? 'none' : '1px dashed var(--border-strong)' }}
    >
      {value != null ? formatMinutes(value) : <span style={{ color: 'var(--ink-muted)' }}>{placeholder}</span>}
    </span>
  );
}
