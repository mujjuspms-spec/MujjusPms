import { useState } from 'react';
import Avatar from './Avatar';
import { PEOPLE, person } from '../services/people';

// A task/subtask's assignee shown as an avatar+name that becomes a select
// of everyone in the workspace on click — matches EditableMoney's pattern.
export default function EditableAssignee({ value, onSave, size = 22, readOnly = false }) {
  const [editing, setEditing] = useState(false);
  const assignee = person(value);

  if (editing) {
    return (
      <select
        autoFocus value={value || ''}
        onChange={(e) => { setEditing(false); if (e.target.value !== value) onSave(e.target.value); }}
        onBlur={() => setEditing(false)}
        style={{ fontSize: 12.5, border: '1px solid var(--brand-500)', borderRadius: 6, padding: '3px 7px', background: 'var(--surface-2)', color: 'var(--ink-primary)', outline: 0 }}
      >
        <option value="">Unassigned</option>
        {PEOPLE.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    );
  }

  return (
    <span onClick={readOnly ? undefined : () => setEditing(true)} title={readOnly ? undefined : 'Click to reassign'} className="flex items-center gap-8" style={{ cursor: readOnly ? 'default' : 'pointer' }}>
      {assignee ? <Avatar person={assignee} size={size} /> : null}
      {assignee ? assignee.name : <span style={{ color: 'var(--ink-muted)', borderBottom: '1px dashed var(--border-strong)' }}>Unassigned</span>}
    </span>
  );
}
