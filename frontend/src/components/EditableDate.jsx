import { useState } from 'react';
import { formatDateInput, toDateInputValue } from '../utils/format';

// A date shown as this app's display string ("30 Jun 2027") that becomes a
// native <input type="date"> on click — matches EditableMoney's pattern.
export default function EditableDate({ value, onSave, placeholder = 'Unscheduled', readOnly = false }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(toDateInputValue(value));

  function commit(nextIso) {
    setEditing(false);
    const next = formatDateInput(nextIso) || 'Unscheduled';
    if (next !== value) onSave(next);
  }

  if (editing) {
    return (
      <input
        autoFocus type="date" value={draft}
        onChange={(e) => { setDraft(e.target.value); commit(e.target.value); }}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => { if (e.key === 'Escape') setEditing(false); }}
        style={{ fontSize: 12.5, border: '1px solid var(--brand-500)', borderRadius: 6, padding: '3px 7px', background: 'var(--surface-2)', color: 'var(--ink-primary)', outline: 0 }}
      />
    );
  }

  return (
    <span
      onClick={readOnly ? undefined : () => { setDraft(toDateInputValue(value)); setEditing(true); }}
      title={readOnly ? undefined : 'Click to edit'}
      style={{ cursor: readOnly ? 'default' : 'pointer', borderBottom: readOnly ? 'none' : '1px dashed var(--border-strong)' }}
    >
      {value && value !== 'Unscheduled' ? value : <span style={{ color: 'var(--ink-muted)' }}>{placeholder}</span>}
    </span>
  );
}
