import { useEffect, useState } from 'react';
import { fetchFieldDefs, fetchFieldValues, setFieldValue } from '../services/customFields';

// Renders one editable row per project-level custom field definition,
// scoped to a single task — the per-task half of the custom fields feature
// (definitions themselves are managed in CustomFieldsPanel).
export default function CustomFieldValues({ projectId, taskId, readOnly = false }) {
  const [fields, setFields] = useState(null);
  const [values, setValues] = useState({});

  useEffect(() => {
    fetchFieldDefs(projectId).then(setFields);
    fetchFieldValues(taskId).then(setValues);
  }, [projectId, taskId]);

  async function change(fieldId, value) {
    const prev = values[fieldId] || '';
    setValues((v) => ({ ...v, [fieldId]: value }));
    try {
      await setFieldValue(taskId, fieldId, value);
    } catch (err) {
      setValues((v) => ({ ...v, [fieldId]: prev }));
      window.alert(err.message || 'Could not save that value');
    }
  }

  if (!fields || fields.length === 0) return null;

  return (
    <div className="col gap-12" style={{ fontSize: 12.5 }}>
      {fields.map((f) => (
        <div key={f.id} className="flex items-center justify-between">
          <span style={{ color: 'var(--ink-muted)' }}>{f.name}</span>
          {f.type === 'select' ? (
            <select value={values[f.id] || ''} onChange={(e) => change(f.id, e.target.value)} disabled={readOnly} style={{ fontSize: 12.5, border: '1px solid var(--border-strong)', background: 'var(--surface-2)', borderRadius: 6, padding: '3px 7px' }}>
              <option value="">—</option>
              {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : f.type === 'checkbox' ? (
            <input type="checkbox" checked={values[f.id] === 'true'} onChange={(e) => change(f.id, String(e.target.checked))} disabled={readOnly} style={{ width: 'auto' }} />
          ) : (
            <input
              type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
              value={values[f.id] || ''} onChange={(e) => change(f.id, e.target.value)}
              disabled={readOnly}
              style={{ fontSize: 12.5, border: '1px solid var(--border-strong)', background: 'var(--surface-2)', borderRadius: 6, padding: '3px 7px', width: 130 }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
