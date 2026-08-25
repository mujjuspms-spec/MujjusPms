import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon';
import TemplateGallery from './TemplateGallery';
import TemplateUseFlow from './TemplateUseFlow';
import { createProject } from '../services/projects';
import { useTasksStore } from '../hooks/useTasksStore';
import { formatDateInput } from '../utils/format';

// Three ways in: start from scratch (the original simple form), browse the
// Template Center gallery, or preview+configure a chosen template — all in
// one modal, matching "do not send the user to an unrelated full-screen page."
export default function NewProjectModal({ onClose }) {
  const navigate = useNavigate();
  const { refresh } = useTasksStore();
  const [step, setStep] = useState('choose'); // 'choose' | 'blank' | 'template'
  const [pickedTemplate, setPickedTemplate] = useState(null);

  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [client, setClient] = useState('');
  const [start, setStart] = useState('');
  const [due, setDue] = useState('');
  const [budget, setBudget] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submitBlank() {
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
      const { project } = await createProject({
        name: name.trim(), desc: desc.trim(), client: client.trim(),
        start: formatDateInput(start) || 'Unscheduled', due: formatDateInput(due) || 'Unscheduled',
        budget: budget === '' ? null : Number(budget),
      });
      onClose();
      navigate(`/projects/${project.id}`);
    } catch (e) {
      setError(e.message || 'Could not create this project');
    } finally {
      setSaving(false);
    }
  }

  async function onTemplateCreated(project, defaultView) {
    await refresh();
    onClose();
    navigate(defaultView ? `/projects/${project.id}?tab=${defaultView}` : `/projects/${project.id}`);
  }

  const width = step === 'choose' ? 820 : step === 'template' ? 760 : 620;

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ width, maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-head">
          <h3 style={{ fontSize: 15 }}>{step === 'blank' ? 'New project' : 'Create a project'}</h3>
          <button className="btn-icon" onClick={onClose} aria-label="Close"><Icon name="i-x" className="icon icon-sm" /></button>
        </div>
        <div className="modal-body" style={{ overflowY: 'auto' }}>
          {step === 'choose' && (
            <>
              <button className="btn btn-secondary" style={{ width: '100%', marginBottom: 16, justifyContent: 'center' }} onClick={() => setStep('blank')}>
                <Icon name="i-plus" className="icon icon-sm" /> Start from scratch
              </button>
              <TemplateGallery onPick={(t) => { setPickedTemplate(t); setStep('template'); }} />
            </>
          )}

          {step === 'blank' && (
            <>
              <button className="btn-icon" onClick={() => setStep('choose')} style={{ marginBottom: 10 }} aria-label="Back">
                <Icon name="i-chevron-start" className="icon icon-sm" />
              </button>
              <div className="field">
                <label>Project name</label>
                <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. NeuroSense Diagnostics" />
              </div>
              <div className="field">
                <label>Description</label>
                <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="One line on what this venture does" />
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
                  Leave blank to calculate the budget from task allocations instead.
                </p>
              </div>
            </>
          )}

          {step === 'template' && pickedTemplate && (
            <TemplateUseFlow template={pickedTemplate} onBack={() => setStep('choose')} onCreated={onTemplateCreated} />
          )}
        </div>
        {step === 'blank' && (
          <div className="modal-foot">
            <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary btn-sm" disabled={!name.trim() || saving} onClick={submitBlank}>
              {saving ? 'Creating…' : 'Create project'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
