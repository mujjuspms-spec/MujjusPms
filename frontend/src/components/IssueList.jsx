import { useEffect, useState } from 'react';
import Icon from './Icon';
import Avatar from './Avatar';
import { fetchIssues, createIssue, updateIssue, deleteIssue } from '../services/issues';
import { onRealtime } from '../services/realtime';
import { person } from '../services/people';
import { PROJECTS, project as getProject } from '../services/projects';
import { useWorkspace } from '../hooks/useWorkspace';

const SEVERITIES = ['low', 'medium', 'high', 'critical'];
const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
const SEV_COLOR = { low: 'var(--ink-muted)', medium: 'var(--cat-2)', high: 'var(--status-warning)', critical: 'var(--status-critical)' };
const STATUS_LABEL = { open: 'Open', in_progress: 'In progress', resolved: 'Resolved', closed: 'Closed' };

// Shared between the global Issues page (no projectId — shows every
// venture) and a project's own "Issues" tab (projectId set) — a distinct
// tracker from Task, with severity/reporter/environment fields none of the
// task views have.
export default function IssueList({ projectId, readOnly = false }) {
  const { isWorkspaceAdmin: isAdmin } = useWorkspace();
  const [issues, setIssues] = useState(null);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [environment, setEnvironment] = useState('');
  // On the portfolio-wide page (no projectId), only offer projects this
  // user can actually create an issue in.
  const editableProjects = projectId ? [] : PROJECTS.filter((p) => isAdmin || p.myRole === 'member');
  const canReport = projectId ? !readOnly : editableProjects.length > 0;
  const [newProjectId, setNewProjectId] = useState(projectId || editableProjects[0]?.id || '');

  function load() { fetchIssues(projectId).then(setIssues); }
  useEffect(load, [projectId]);

  useEffect(() => onRealtime((msg) => {
    if (!['issue.created', 'issue.updated', 'issue.deleted'].includes(msg.type)) return;
    if (projectId && msg.payload.project && msg.payload.project !== projectId) return;
    load();
  }), [projectId]);

  async function addIssue() {
    if (!title.trim()) return;
    await createIssue({ projectId: projectId || newProjectId, title: title.trim(), severity, environment });
    setTitle(''); setEnvironment(''); setAdding(false);
    load();
  }
  async function setStatus(issue, status) {
    await updateIssue(issue.id, { status });
    load();
  }
  async function remove(id) {
    await deleteIssue(id);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>{issues?.length ?? '…'} issue{issues?.length === 1 ? '' : 's'}</div>
        {canReport && (
          <button className="btn btn-primary btn-sm" onClick={() => setAdding((a) => !a)}><Icon name="i-plus" className="icon icon-sm" />Report issue</button>
        )}
      </div>

      {adding && canReport && (
        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <div className="field"><label>Title</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Login fails on Safari" autoFocus /></div>
          <div className="flex gap-12 wrap">
            {!projectId && (
              <div className="field grow">
                <label>Venture</label>
                <select value={newProjectId} onChange={(e) => setNewProjectId(e.target.value)}>
                  {editableProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
            <div className="field" style={{ width: 140 }}>
              <label>Severity</label>
              <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
                {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="field grow">
              <label>Environment</label>
              <input value={environment} onChange={(e) => setEnvironment(e.target.value)} placeholder="e.g. Production, Safari 17" />
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={addIssue}>Create issue</button>
        </div>
      )}

      <div className="col gap-10">
        {issues === null && <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>Loading…</p>}
        {issues?.length === 0 && <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>No issues reported.</p>}
        {issues?.map((issue) => {
          const reporter = person(issue.reporterId);
          const assignee = person(issue.assigneeId);
          const proj = getProject(issue.project);
          return (
            <div key={issue.id} className="card card-pad">
              <div className="flex items-center gap-10" style={{ marginBottom: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: SEV_COLOR[issue.severity], flex: '0 0 auto' }} />
                <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: SEV_COLOR[issue.severity] }}>{issue.severity}</span>
                {!projectId && <span style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>· {proj?.name}</span>}
                {issue.environment && <span style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>· {issue.environment}</span>}
                <div className="grow" />
                <select
                  value={issue.status} onChange={(e) => setStatus(issue, e.target.value)}
                  disabled={projectId ? readOnly : !(isAdmin || getProject(issue.project)?.myRole === 'member')}
                  style={{ fontSize: 11.5, padding: '3px 6px', border: '1px solid var(--border-strong)', background: 'var(--surface-2)', borderRadius: 6 }}
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
                {(projectId ? !readOnly : (isAdmin || getProject(issue.project)?.myRole === 'member')) && (
                  <button className="btn-icon" title="Delete issue" onClick={() => remove(issue.id)}><Icon name="i-trash" className="icon icon-sm" /></button>
                )}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{issue.title}</div>
              <div className="flex items-center gap-14" style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>
                <span className="flex items-center gap-6"><Avatar person={reporter} size={18} />Reported by {reporter?.name}</span>
                {assignee && <span className="flex items-center gap-6"><Avatar person={assignee} size={18} />Assigned to {assignee.name}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
