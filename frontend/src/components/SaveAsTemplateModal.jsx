import { useState } from 'react';
import Icon from './Icon';
import { saveProjectAsTemplate, CATEGORY_LABEL, CATEGORY_ORDER } from '../services/projectTemplates';

export default function SaveAsTemplateModal({ projectId, defaultName, onClose }) {
  const [name, setName] = useState(defaultName ? `${defaultName} Template` : '');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('PROJECT_MANAGEMENT');
  const [includeHierarchy, setIncludeHierarchy] = useState(true);
  const [includeMilestones, setIncludeMilestones] = useState(true);
  const [includeDependencies, setIncludeDependencies] = useState(true);
  const [includeCustomFields, setIncludeCustomFields] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!name.trim() || busy) return;
    setBusy(true); setError('');
    try {
      await saveProjectAsTemplate(projectId, {
        name: name.trim(), description: description.trim(), category,
        includeHierarchy, includeMilestones, includeDependencies, includeCustomFields,
      });
      onClose();
    } catch (e) {
      setError(e.message || 'Could not save this template');
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ width: 480 }}>
        <div className="modal-head">
          <h3 style={{ fontSize: 15 }}>Save as template</h3>
          <button className="btn-icon" onClick={onClose} aria-label="Close"><Icon name="i-x" className="icon icon-sm" /></button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>Template name</label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. MedTech Pilot Project" />
          </div>
          <div className="field">
            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this template for?" />
          </div>
          <div className="field">
            <label>Include</label>
            <div className="col gap-6">
              <label className="flex items-center gap-8" style={{ fontSize: 12.5, cursor: 'pointer' }}>
                <input type="checkbox" style={{ width: 'auto' }} checked={includeHierarchy} onChange={(e) => setIncludeHierarchy(e.target.checked)} /> Task hierarchy
              </label>
              <label className="flex items-center gap-8" style={{ fontSize: 12.5, cursor: 'pointer' }}>
                <input type="checkbox" style={{ width: 'auto' }} checked={includeMilestones} onChange={(e) => setIncludeMilestones(e.target.checked)} /> Milestones
              </label>
              <label className="flex items-center gap-8" style={{ fontSize: 12.5, cursor: 'pointer' }}>
                <input type="checkbox" style={{ width: 'auto' }} checked={includeDependencies} onChange={(e) => setIncludeDependencies(e.target.checked)} /> Dependencies
              </label>
              <label className="flex items-center gap-8" style={{ fontSize: 12.5, cursor: 'pointer' }}>
                <input type="checkbox" style={{ width: 'auto' }} checked={includeCustomFields} onChange={(e) => setIncludeCustomFields(e.target.checked)} /> Custom fields
              </label>
            </div>
          </div>
          <p style={{ fontSize: 11, color: 'var(--ink-muted)' }}>
            Comments, attachments, activity history, real assignees, and timestamps are never included in a template.
          </p>
          {error && <p style={{ fontSize: 12.5, color: 'var(--status-critical)' }}>{error}</p>}
        </div>
        <div className="modal-foot">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" disabled={!name.trim() || busy} onClick={submit}>
            {busy ? 'Saving…' : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  );
}
