import { useState } from 'react';
import Modal from './Modal';
import { useI18n } from '../hooks/useI18n';
import { useWorkspace } from '../hooks/useWorkspace';
import { useTasksStore } from '../hooks/useTasksStore';
import { PROJECTS } from '../services/projects';
import { PEOPLE } from '../services/people';
import { STATUS_LABEL_KEY } from '../utils/format';

export default function QuickAddModal({ onClose, defaultProjectId, defaultStatus }) {
  const { t } = useI18n();
  const { isWorkspaceAdmin: isAdmin } = useWorkspace();
  const { addTask } = useTasksStore();
  // Only projects this user can actually create a task in.
  const editableProjects = PROJECTS.filter((p) => isAdmin || p.myRole === 'member');
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState(defaultProjectId || editableProjects[0]?.id || '');
  const [assignee, setAssignee] = useState(PEOPLE[0]?.id || '');
  const [priority, setPriority] = useState('medium');
  const [due, setDue] = useState('');
  const [budget, setBudget] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');

  function submit() {
    if (!title.trim() || !projectId) return;
    addTask({
      title: title.trim(), project: projectId, assignee, priority, due: due || 'Unscheduled', desc: title.trim(),
      budget: budget === '' ? null : Number(budget),
      estimatedMinutes: estimatedHours === '' ? null : Math.round(Number(estimatedHours) * 60),
      ...(defaultStatus ? { status: defaultStatus } : {}),
    });
    onClose();
  }

  return (
    <Modal
      title={t('top.new')}
      onClose={onClose}
      footer={<>
        <button className="btn btn-secondary btn-sm" onClick={onClose}>{t('common.cancel')}</button>
        <button className="btn btn-primary btn-sm" disabled={!projectId} onClick={submit}>{t('common.save')}</button>
      </>}
    >
      {editableProjects.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>You don't have create access on any project yet.</p>
      ) : (
      <>
      {defaultStatus && defaultStatus !== 'todo' && (
        <p style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: -4, marginBottom: 10 }}>
          Adding to <b>{t(STATUS_LABEL_KEY[defaultStatus] || defaultStatus)}</b>
        </p>
      )}
      <div className="field">
        <label>Task title</label>
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Draft investor update" />
      </div>
      <div className="field">
        <label>{t('nav.projects')}</label>
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          {editableProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="flex gap-12">
        <div className="field grow">
          <label>{t('common.assignee')}</label>
          <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            {PEOPLE.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="field grow">
          <label>{t('common.priority')}</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>
      <div className="flex gap-12">
        <div className="field grow">
          <label>{t('common.due')}</label>
          <input value={due} onChange={(e) => setDue(e.target.value)} placeholder="e.g. 30 Nov 2026" />
        </div>
        <div className="field grow">
          <label>Budget in USD (optional)</label>
          <div className="flex items-center" style={{ border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', paddingInlineStart: 11 }}>
            <span style={{ fontSize: 13, color: 'var(--ink-muted)', fontWeight: 700 }}>$</span>
            <input
              type="number" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="25000"
              style={{ border: 0, background: 'transparent', padding: '9px 11px 9px 4px' }}
            />
          </div>
        </div>
      </div>
      <div className="field">
        <label>Estimated hours (optional)</label>
        <input
          type="number" min="0" step="0.25" value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} placeholder="e.g. 8"
        />
      </div>
      </>
      )}
    </Modal>
  );
}
