import { useState } from 'react';

export default function EditableText({ value, onSave, placeholder = 'Click to add', multiline = false, textStyle, readOnly = false }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');

  function commit() {
    setEditing(false);
    const next = draft.trim();
    if (next !== (value ?? '')) onSave(next);
  }

  if (editing) {
    const Field = multiline ? 'textarea' : 'input';
    return (
      <Field
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { setDraft(value ?? ''); setEditing(false); }
          if (e.key === 'Enter' && !multiline) commit();
        }}
        rows={multiline ? 3 : undefined}
        style={{
          width: '100%', fontSize: textStyle?.fontSize ?? 13, fontWeight: textStyle?.fontWeight,
          border: '1px solid var(--brand-500)', borderRadius: 6, padding: '6px 9px',
          background: 'var(--surface-2)', color: 'var(--ink-primary)', outline: 0,
          fontFamily: 'inherit', lineHeight: multiline ? 1.6 : undefined, resize: multiline ? 'vertical' : undefined,
        }}
      />
    );
  }

  return (
    <div
      onClick={readOnly ? undefined : () => { setDraft(value ?? ''); setEditing(true); }}
      title={readOnly ? undefined : 'Click to edit'}
      style={{
        cursor: readOnly ? 'default' : 'pointer', borderBottom: multiline ? 'none' : '1px dashed transparent',
        borderRadius: 6, padding: '2px 4px', marginInline: -4,
        ...textStyle,
      }}
      onMouseEnter={readOnly ? undefined : (e) => { e.currentTarget.style.background = 'var(--surface-2)'; }}
      onMouseLeave={readOnly ? undefined : (e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {value ? value : <span style={{ color: 'var(--ink-muted)' }}>{placeholder}</span>}
    </div>
  );
}
