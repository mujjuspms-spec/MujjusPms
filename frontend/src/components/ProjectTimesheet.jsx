import { useEffect, useMemo, useState } from 'react';
import Icon from './Icon';
import Avatar from './Avatar';
import { useTasksStore } from '../hooks/useTasksStore';
import { useAuth } from '../hooks/useAuth';
import { useWorkspace } from '../hooks/useWorkspace';
import { fetchProjectTimesheets, logTime, deleteTimeEntry, timesheetExportUrl } from '../services/timesheets';
import { person } from '../services/people';
import { formatDateInput, parseDate } from '../utils/format';

// Per-project time log: a log-time form plus entries grouped by task, each
// group expandable to show the individual dated entries. Shared between the
// project detail "Timesheet" tab and the Budgets drill-down page so both
// stay in sync instead of maintaining two copies of this logic.
export default function ProjectTimesheet({ projectId, readOnly = false }) {
  const { user } = useAuth();
  const { isWorkspaceAdmin } = useWorkspace();
  const { tasks: allTasks } = useTasksStore();
  const tasks = useMemo(() => allTasks.filter((t) => t.project === projectId), [allTasks, projectId]);

  const [entries, setEntries] = useState(null);
  const [taskId, setTaskId] = useState('');
  const [date, setDate] = useState('');
  const [hours, setHours] = useState('');
  const [note, setNote] = useState('');
  const [openKey, setOpenKey] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchProjectTimesheets(projectId).then(setEntries); }, [projectId]);

  const totalHours = (entries || []).reduce((s, e) => s + e.hours, 0);

  const groups = useMemo(() => {
    const map = new Map();
    for (const en of entries || []) {
      const key = en.taskId || '__general';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(en);
    }
    return Array.from(map.entries())
      .map(([key, list]) => ({
        key,
        title: key === '__general' ? 'General (no task)' : (tasks.find((t) => t.id === key)?.title || 'Unknown task'),
        hours: list.reduce((s, e) => s + e.hours, 0),
        entries: list.sort((a, b) => parseDate(b.date) - parseDate(a.date)),
      }))
      .sort((a, b) => b.hours - a.hours);
  }, [entries, tasks]);

  async function submitEntry(e) {
    e.preventDefault();
    if (!date || !hours || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const entry = await logTime({ projectId, taskId: taskId || null, date: formatDateInput(date), hours: Number(hours), note });
      setEntries((es) => [entry, ...(es || [])]);
      setTaskId(''); setDate(''); setHours(''); setNote('');
    } catch (err) {
      setError(err.message || 'Could not log this time entry');
    } finally {
      setSubmitting(false);
    }
  }

  async function removeEntry(entryId) {
    try {
      await deleteTimeEntry(entryId);
      setEntries((es) => es.filter((e) => e.id !== entryId));
    } catch (err) {
      setError(err.message || 'Could not delete this entry');
    }
  }

  return (
    <div className="card card-pad">
      <div className="flex items-center justify-between" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ fontSize: 14.5 }}>Timesheet</h3>
        <div className="flex items-center gap-12">
          <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{totalHours}h logged total</span>
          {isWorkspaceAdmin && (
            <a className="btn btn-secondary btn-sm" href={timesheetExportUrl(projectId)}>
              <Icon name="i-download" className="icon icon-sm" /> Export .xlsx
            </a>
          )}
        </div>
      </div>

      {!readOnly && (
      <>
        <form onSubmit={submitEntry} className="flex items-end gap-8" style={{ marginBottom: error ? 8 : 16, flexWrap: 'wrap' }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Task</label>
            <select value={taskId} onChange={(e) => setTaskId(e.target.value)}>
              <option value="">General (no task)</option>
              {tasks.map((tk) => <option key={tk.id} value={tk.id}>{tk.title}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Date</label>
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0, width: 90 }}>
            <label>Hours</label>
            <input type="number" min="0" step="0.25" required value={hours} onChange={(e) => setHours(e.target.value)} />
          </div>
          <div className="field grow" style={{ marginBottom: 0 }}>
            <label>Note</label>
            <input type="text" placeholder="What did you work on?" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>{submitting ? 'Logging…' : 'Log time'}</button>
        </form>
        {error && <p style={{ fontSize: 12, color: 'var(--status-critical)', marginBottom: 16 }}>{error}</p>}
      </>
      )}

      {entries === null && <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>Loading…</p>}
      {entries && entries.length === 0 && <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>No time logged yet.</p>}
      {groups.length > 0 && (
        <div className="col gap-8">
          {groups.map((g) => (
            <div key={g.key}>
              <div
                className="flex items-center justify-between"
                style={{ padding: '9px 10px', background: 'var(--surface-2)', borderRadius: 8, cursor: 'pointer' }}
                onClick={() => setOpenKey((k) => (k === g.key ? null : g.key))}
              >
                <div className="flex items-center gap-8">
                  <Icon name={openKey === g.key ? 'i-chevron-down' : 'i-chevron-end'} className="icon icon-sm" style={{ color: 'var(--ink-muted)' }} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{g.title}</span>
                </div>
                <span className="tabular" style={{ fontSize: 13, fontWeight: 700 }}>{g.hours}h</span>
              </div>
              {openKey === g.key && (
                <div className="col gap-6" style={{ padding: '8px 6px 4px 30px' }}>
                  {g.entries.map((en) => {
                    const u = person(en.userId);
                    const mine = user?.id === en.userId;
                    return (
                      <div key={en.id} className="flex items-center gap-10" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                        <Avatar person={u} size={22} />
                        <div className="grow">
                          <div style={{ fontSize: 12.5 }}>{u?.name} — {en.date}</div>
                          {en.note && <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{en.note}</div>}
                        </div>
                        <span className="tabular" style={{ fontSize: 12.5, fontWeight: 700 }}>{en.hours}h</span>
                        {mine && (
                          <button className="btn-icon" title="Delete entry" onClick={() => removeEntry(en.id)}>
                            <Icon name="i-trash" className="icon icon-sm" style={{ color: 'var(--ink-muted)' }} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
