import { useEffect, useState } from 'react';
import Icon from './Icon';
import { fetchFieldDefs, createFieldDef, deleteFieldDef } from '../services/customFields';

const TYPES = ['text', 'number', 'select', 'date', 'checkbox'];

// Project-level custom field definitions — the "make it fit our workflow"
// capability every comparison tool treats as standard. Values are edited
// per-task in TaskPanel (see CustomFieldValues.jsx), not here.
export default function CustomFieldsPanel({ projectId, readOnly = false }) {
  const [fields, setFields] = useState(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('text');
  const [optionsText, setOptionsText] = useState('');

  function load() { fetchFieldDefs(projectId).then(setFields); }
  useEffect(load, [projectId]);

  async function addField() {
    if (!name.trim()) return;
    const options = type === 'select' ? optionsText.split(',').map((s) => s.trim()).filter(Boolean) : [];
    await createFieldDef({ projectId, name: name.trim(), type, options });
    setName(''); setOptionsText('');
    load();
  }
  async function remove(id) {
    await deleteFieldDef(id);
    load();
  }

  return (
    <div className="card card-pad">
      <h3 style={{ fontSize: 14.5, marginBottom: 6 }}>Custom fields</h3>
      <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 14 }}>Extra fields shown on every task in this venture — edit their values from the task detail panel.</p>

      {!readOnly && (
        <div className="flex gap-8 wrap" style={{ marginBottom: 16 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Field name, e.g. Client tier" style={{ flex: '1 1 180px', border: '1px solid var(--border-strong)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '9px 11px', fontSize: 13 }} />
          <select value={type} onChange={(e) => setType(e.target.value)} style={{ border: '1px solid var(--border-strong)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '9px 11px', fontSize: 13 }}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {type === 'select' && (
            <input value={optionsText} onChange={(e) => setOptionsText(e.target.value)} placeholder="Options, comma-separated" style={{ flex: '1 1 200px', border: '1px solid var(--border-strong)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '9px 11px', fontSize: 13 }} />
          )}
          <button className="btn btn-primary btn-sm" onClick={addField}><Icon name="i-plus" className="icon icon-sm" />Add field</button>
        </div>
      )}

      <div className="col gap-8">
        {fields?.map((f) => (
          <div key={f.id} className="flex items-center gap-10" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <div className="grow">
              <span style={{ fontSize: 13, fontWeight: 600 }}>{f.name}</span>
              <span style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginInlineStart: 8 }}>{f.type}{f.options.length ? ` — ${f.options.join(', ')}` : ''}</span>
            </div>
            {!readOnly && (
              <button className="btn-icon" title="Delete field" onClick={() => remove(f.id)}><Icon name="i-trash" className="icon icon-sm" /></button>
            )}
          </div>
        ))}
        {fields?.length === 0 && <p style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>No custom fields yet.</p>}
      </div>
    </div>
  );
}
