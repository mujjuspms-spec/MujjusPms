import { useState } from 'react';
import { money, moneyFull } from '../utils/format';

export default function EditableMoney({ value, onSave, placeholder = 'Not set', readOnly = false }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');

  function commit() {
    setEditing(false);
    const num = draft === '' ? null : Number(draft);
    if (num !== value) onSave(num);
  }

  if (editing) {
    return (
      <span className="flex items-center gap-6">
        <span
          className="flex items-center gap-4"
          style={{ border: '1px solid var(--brand-500)', borderRadius: 6, background: 'var(--surface-2)', padding: '2px 2px 2px 8px' }}
        >
          <span style={{ fontSize: 12.5, color: 'var(--ink-muted)', fontWeight: 700 }}>$</span>
          <input
            autoFocus type="number" min="0" step="1" value={draft} onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
            style={{ width: 100, fontSize: 12.5, border: 0, borderRadius: 4, padding: '3px 5px', background: 'transparent', color: 'var(--ink-primary)', outline: 0 }}
          />
        </span>
        <span style={{ fontSize: 10.5, color: 'var(--ink-muted)', fontWeight: 700, letterSpacing: '.03em' }}>USD</span>
      </span>
    );
  }

  return (
    <span
      onClick={readOnly ? undefined : () => { setDraft(value ?? ''); setEditing(true); }}
      title={readOnly ? (value != null ? moneyFull(value) : placeholder) : (value != null ? `${moneyFull(value)} — click to edit` : 'Click to add a budget in USD')}
      style={{ cursor: readOnly ? 'default' : 'pointer', borderBottom: readOnly ? 'none' : '1px dashed var(--border-strong)' }}
    >
      {value != null ? money(value) : <span style={{ color: 'var(--ink-muted)' }}>{placeholder}</span>}
    </span>
  );
}
