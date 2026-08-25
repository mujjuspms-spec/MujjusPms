import { useState } from 'react';
import Icon from './Icon';
import { saveCustomTemplate } from '../services/roadmap';
import { CATEGORY_LABEL, CATEGORY_ORDER } from '../services/projectTemplates';

// Builds a brand-new template from scratch — phases (top-level tasks) each
// with their own subtasks — rather than capturing an existing project.
export default function CreateTemplateModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('PROJECT_MANAGEMENT');
  const [phases, setPhases] = useState([{ title: '', description: '', subtasks: [] }]);
  const [newSubtask, setNewSubtask] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function updatePhase(idx, patch) {
    setPhases((ps) => ps.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  }
  function addPhase() {
    setPhases((ps) => [...ps, { title: '', description: '', subtasks: [] }]);
  }
  function removePhase(idx) {
    setPhases((ps) => ps.filter((_, i) => i !== idx));
  }
  function addSubtask(idx) {
    const text = (newSubtask[idx] || '').trim();
    if (!text) return;
    updatePhase(idx, { subtasks: [...phases[idx].subtasks, text] });
    setNewSubtask((s) => ({ ...s, [idx]: '' }));
  }
  function removeSubtask(idx, subIdx) {
    updatePhase(idx, { subtasks: phases[idx].subtasks.filter((_, j) => j !== subIdx) });
  }

  const validPhases = phases.filter((p) => p.title.trim());
  const canSave = name.trim() && validPhases.length > 0 && !saving;

  async function submit() {
    if (!canSave) return;
    setSaving(true);
    setError('');
    try {
      await saveCustomTemplate({
        name: name.trim(), description: description.trim(), category,
        phases: validPhases.map((p) => ({ title: p.title.trim(), description: p.description.trim(), subtasks: p.subtasks })),
      });
      onCreated();
    } catch (e) {
      setError(e.message || 'Could not create this template');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ width: 620, maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-head">
          <h3 style={{ fontSize: 15 }}>Create a new template</h3>
          <button className="btn-icon" onClick={onClose} aria-label="Close"><Icon name="i-x" className="icon icon-sm" /></button>
        </div>
        <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
          <div className="field">
            <label>Template name</label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Clinical Trial Setup" />
          </div>
          <div className="flex gap-12">
            <div className="field grow">
              <label>Description (optional)</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="One line describing when to use this" />
            </div>
            <div className="field" style={{ width: 180 }}>
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
              </select>
            </div>
          </div>

          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-secondary)', display: 'block', margin: '14px 0 8px' }}>
            Phases (become top-level tasks) &amp; subtasks
          </label>
          <div className="col gap-12">
            {phases.map((phase, pi) => (
              <div key={pi} className="card card-pad">
                <div className="flex items-center gap-6" style={{ marginBottom: 8 }}>
                  <input
                    value={phase.title} onChange={(e) => updatePhase(pi, { title: e.target.value })}
                    placeholder={`Phase ${pi + 1} title`}
                    style={{ flex: 1, fontSize: 13, fontWeight: 700, border: '1px solid var(--border-strong)', borderRadius: 6, padding: '6px 9px', background: 'var(--surface-2)', color: 'var(--ink-primary)' }}
                  />
                  {phases.length > 1 && (
                    <button className="btn-icon" title="Remove phase" onClick={() => removePhase(pi)}>
                      <Icon name="i-trash" className="icon icon-sm" style={{ color: 'var(--ink-muted)' }} />
                    </button>
                  )}
                </div>
                <input
                  value={phase.description} onChange={(e) => updatePhase(pi, { description: e.target.value })}
                  placeholder="Phase description (optional)"
                  style={{ width: '100%', fontSize: 12, border: '1px solid var(--border)', borderRadius: 6, padding: '5px 9px', background: 'var(--surface-2)', color: 'var(--ink-secondary)', marginBottom: 8 }}
                />
                <div className="col gap-4" style={{ marginBottom: 8 }}>
                  {phase.subtasks.map((s, si) => (
                    <div key={si} className="flex items-center gap-8" style={{ fontSize: 12.5, padding: '2px 0' }}>
                      <Icon name="i-check" className="icon icon-sm" style={{ color: 'var(--ink-muted)', flexShrink: 0 }} />
                      <span className="grow">{s}</span>
                      <button className="btn-icon" style={{ width: 18, height: 18 }} onClick={() => removeSubtask(pi, si)}>
                        <Icon name="i-x" style={{ width: 10, height: 10 }} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-6">
                  <input
                    value={newSubtask[pi] || ''} onChange={(e) => setNewSubtask((s) => ({ ...s, [pi]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') addSubtask(pi); }}
                    placeholder="Add a subtask…"
                    style={{ flex: 1, fontSize: 12.5, border: '1px solid var(--border-strong)', borderRadius: 6, padding: '5px 9px', background: 'var(--surface-2)', color: 'var(--ink-primary)' }}
                  />
                  <button className="btn btn-sm btn-ghost" onClick={() => addSubtask(pi)}>Add</button>
                </div>
              </div>
            ))}
            <button className="btn btn-secondary btn-sm" onClick={addPhase}>
              <Icon name="i-plus" className="icon icon-sm" />Add another phase
            </button>
          </div>
          {error && <p style={{ fontSize: 12.5, color: 'var(--status-critical)', marginTop: 10 }}>{error}</p>}
        </div>
        <div className="modal-foot">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" disabled={!canSave} onClick={submit}>
            {saving ? 'Creating…' : 'Create template'}
          </button>
        </div>
      </div>
    </div>
  );
}
