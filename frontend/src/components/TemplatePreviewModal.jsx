import { useState } from 'react';
import Icon from './Icon';

// Shows a template's phases/subtasks before it's applied, and lets the
// user add more phases or subtasks to their own copy first — those
// additions ride along with the template when "Use this template" is
// clicked (via onUse), without changing the shared template itself.
export default function TemplatePreviewModal({ template, onClose, onUse, actionLabel = 'Use this template' }) {
  const [phases, setPhases] = useState(() => template.phases.map((p) => ({ ...p, subtasks: [...(p.subtasks || [])] })));
  const [newSubtask, setNewSubtask] = useState({});
  const [newPhaseTitle, setNewPhaseTitle] = useState('');
  const [addingPhase, setAddingPhase] = useState(false);

  function addSubtask(phaseIdx) {
    const text = (newSubtask[phaseIdx] || '').trim();
    if (!text) return;
    setPhases((ps) => ps.map((p, i) => (i === phaseIdx ? { ...p, subtasks: [...p.subtasks, text] } : p)));
    setNewSubtask((s) => ({ ...s, [phaseIdx]: '' }));
  }

  function removeSubtask(phaseIdx, subIdx) {
    setPhases((ps) => ps.map((p, i) => (i === phaseIdx ? { ...p, subtasks: p.subtasks.filter((_, j) => j !== subIdx) } : p)));
  }

  function addPhase() {
    if (!newPhaseTitle.trim()) return;
    setPhases((ps) => [...ps, { title: newPhaseTitle.trim(), description: '', subtasks: [] }]);
    setNewPhaseTitle('');
    setAddingPhase(false);
  }

  function removePhase(phaseIdx) {
    setPhases((ps) => ps.filter((_, i) => i !== phaseIdx));
  }

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ width: 620, maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-head">
          <div>
            <h3 style={{ fontSize: 15 }}>{template.name}</h3>
            <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>{template.description}</p>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close"><Icon name="i-x" className="icon icon-sm" /></button>
        </div>
        <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
          <div className="col gap-14">
            {phases.map((phase, pi) => (
              <div key={pi} className="card card-pad">
                <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{phase.title}</div>
                    {phase.description && <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 2 }}>{phase.description}</div>}
                  </div>
                  <button className="btn-icon" title="Remove phase" onClick={() => removePhase(pi)}>
                    <Icon name="i-trash" className="icon icon-sm" style={{ color: 'var(--ink-muted)' }} />
                  </button>
                </div>
                <div className="col gap-4" style={{ marginBottom: 8 }}>
                  {phase.subtasks.map((s, si) => (
                    <div key={si} className="flex items-center gap-8" style={{ fontSize: 12.5, padding: '3px 0' }}>
                      <Icon name="i-check" className="icon icon-sm" style={{ color: 'var(--ink-muted)', flexShrink: 0 }} />
                      <span className="grow">{s}</span>
                      <button className="btn-icon" style={{ width: 18, height: 18 }} onClick={() => removeSubtask(pi, si)}>
                        <Icon name="i-x" style={{ width: 10, height: 10 }} />
                      </button>
                    </div>
                  ))}
                  {phase.subtasks.length === 0 && <p style={{ fontSize: 12, color: 'var(--ink-muted)' }}>No subtasks yet.</p>}
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

            {addingPhase ? (
              <div className="card card-pad flex gap-6 items-center">
                <input
                  autoFocus value={newPhaseTitle} onChange={(e) => setNewPhaseTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addPhase(); if (e.key === 'Escape') { setAddingPhase(false); setNewPhaseTitle(''); } }}
                  placeholder="New phase / task title"
                  style={{ flex: 1, fontSize: 13, border: '1px solid var(--border-strong)', borderRadius: 6, padding: '6px 9px', background: 'var(--surface-2)', color: 'var(--ink-primary)' }}
                />
                <button className="btn btn-sm btn-primary" onClick={addPhase}>Add</button>
                <button className="btn btn-sm btn-ghost" onClick={() => { setAddingPhase(false); setNewPhaseTitle(''); }}>Cancel</button>
              </div>
            ) : (
              <button className="btn btn-secondary btn-sm" onClick={() => setAddingPhase(true)}>
                <Icon name="i-plus" className="icon icon-sm" />Add phase / task
              </button>
            )}
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" disabled={phases.length === 0} onClick={() => onUse(phases)}>
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
