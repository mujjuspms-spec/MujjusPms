import { useState } from 'react';
import Icon from './Icon';
import { HEALTH_META } from './Pill';
import { updateProject } from '../services/projects';
import { PEOPLE } from '../services/people';
import { formatDateInput, toDateInputValue } from '../utils/format';

// Mirrors NewProjectModal's "blank" step fields/styling exactly — same
// theme, same field set plus Owner/Health/Budget, which only had inline
// per-field editing (or, for Owner, no editing at all) before this.
export default function EditProjectModal({ project, onClose, onSaved }) {
  const [name, setName] = useState(project.name || '');
  const [desc, setDesc] = useState(project.desc || '');
  const [client, setClient] = useState(project.client || '');
  const [ownerId, setOwnerId] = useState(project.ownerId || '');
  const [health, setHealth] = useState(project.health || 'good');
  const [start, setStart] = useState(toDateInputValue(project.start));
  const [due, setDue] = useState(toDateInputValue(project.due));
  const [budget, setBudget] = useState(project.budget != null ? String(project.budget) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!name.trim() || saving) return;
    if (start && due && due < start) {
      setError('Due date cannot be before the start date');
      return;
    }
    if (budget !== '' && Number(budget) < 0) {
      setError('Budget cannot be negative');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updated = await updateProject(project.id, {
        name: name.trim(), desc: desc.trim(), client: client.trim(), ownerId, health,
        start: formatDateInput(start) || 'Unscheduled', due: formatDateInput(due) || 'Unscheduled',
        budget: budget === '' ? null : Number(budget),
      });
      onSaved?.(updated);
      onClose();
    } catch (e) {
      setError(e.message || 'Could not save this project');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ width: 620, maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-head">
          <h3 style={{ fontSize: 15 }}>Edit project</h3>
          <button className="btn-icon" onClick={onClose} aria-label="Close"><Icon name="i-x" className="icon icon-sm" /></button>
        </div>
        <div className="modal-body" style={{ overflowY: 'auto' }}>
          <div className="field">
            <label>Project name</label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label>Description</label>
            <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="One line on what this venture does" />
          </div>
          <div className="flex gap-12">
            <div className="field grow">
              <label>Owner</label>
              <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
                {PEOPLE.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="field grow">
              <label>Project health</label>
              <select value={health} onChange={(e) => setHealth(e.target.value)}>
                {Object.entries(HEALTH_META).map(([key, m]) => <option key={key} value={key}>{m.text}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-12">
            <div className="field grow">
              <label>Client / entity</label>
              <input value={client} onChange={(e) => setClient(e.target.value)} placeholder="e.g. Internal" />
            </div>
            <div className="field grow">
              <label>Start date</label>
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="field grow">
              <label>Due date</label>
              <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            </div>
          </div>
          {error && <p style={{ fontSize: 12.5, color: 'var(--status-critical)', marginTop: -6 }}>{error}</p>}
          <div className="field" style={{ maxWidth: 220 }}>
            <label>Project Budget (optional)</label>
            <div className="flex items-center" style={{ border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', paddingInlineStart: 11 }}>
              <span style={{ fontSize: 13, color: 'var(--ink-muted)', fontWeight: 700 }}>$</span>
              <input
                type="number" min="0" step="any" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Enter project budget"
                style={{ border: 0, background: 'transparent', padding: '9px 11px 9px 4px' }}
              />
            </div>
            <p style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 4 }}>
              Clear this to calculate the budget from task allocations instead. Task budgets are never changed by editing this field.
            </p>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" disabled={!name.trim() || saving} onClick={submit}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
