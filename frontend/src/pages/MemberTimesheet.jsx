import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Icon from '../components/Icon';
import Avatar from '../components/Avatar';
import { useTasksStore } from '../hooks/useTasksStore';
import { useWorkspace } from '../hooks/useWorkspace';
import { person } from '../services/people';
import { project as getProject } from '../services/projects';
import { fetchUserTimesheets, timesheetExportUrl } from '../services/timesheets';
import { parseDate } from '../utils/format';

export default function MemberTimesheet() {
  const { id } = useParams();
  const { isWorkspaceAdmin } = useWorkspace();
  const { tasks: allTasks } = useTasksStore();
  const p = person(id);
  const [entries, setEntries] = useState(null);
  const [denied, setDenied] = useState(false);
  const [openProjectId, setOpenProjectId] = useState(null);

  useEffect(() => {
    setDenied(false);
    fetchUserTimesheets(id).then(setEntries).catch(() => setDenied(true));
  }, [id]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const en of entries || []) {
      if (!map.has(en.projectId)) map.set(en.projectId, []);
      map.get(en.projectId).push(en);
    }
    return Array.from(map.entries())
      .map(([projectId, list]) => ({
        projectId,
        project: getProject(projectId),
        hours: list.reduce((s, e) => s + e.hours, 0),
        entries: list.sort((a, b) => parseDate(b.date) - parseDate(a.date)),
      }))
      .sort((a, b) => b.hours - a.hours);
  }, [entries]);

  const totalHours = (entries || []).reduce((s, e) => s + e.hours, 0);

  if (!p) return <section className="view"><p>Person not found.</p></section>;
  if (denied) return <section className="view"><p>You can only view your own timesheet.</p></section>;

  return (
    <section className="view">
      <div className="breadcrumb">
        <Link to="/team">Team</Link> / <b>{p.name}</b>
      </div>

      <div className="view-header">
        <div className="flex items-center gap-12">
          <Avatar person={p} size={44} />
          <div>
            <div className="view-title">{p.name}</div>
            <div className="view-subtitle">{p.role}</div>
          </div>
        </div>
        {isWorkspaceAdmin && (
          <a className="btn btn-secondary btn-sm" href={timesheetExportUrl()}>
            <Icon name="i-download" className="icon icon-sm" /> Export all as .xlsx
          </a>
        )}
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
        <div className="stat-tile">
          <div className="s-label">Total hours logged</div>
          <div className="s-value tabular">{totalHours}h</div>
        </div>
        <div className="stat-tile">
          <div className="s-label">Ventures worked on</div>
          <div className="s-value tabular">{groups.length}</div>
        </div>
      </div>

      {entries === null && <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>Loading…</p>}
      {entries && entries.length === 0 && <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>No time logged yet.</p>}

      <div className="col gap-10">
        {groups.map((g) => (
          <div key={g.projectId} className="card card-pad">
            <div
              className="flex items-center justify-between"
              style={{ cursor: 'pointer' }}
              onClick={() => setOpenProjectId((k) => (k === g.projectId ? null : g.projectId))}
            >
              <div className="flex items-center gap-8">
                <Icon name={openProjectId === g.projectId ? 'i-chevron-down' : 'i-chevron-end'} className="icon icon-sm" style={{ color: 'var(--ink-muted)' }} />
                <span style={{ fontWeight: 700, fontSize: 13.5 }}>{g.project?.name || g.projectId}</span>
              </div>
              <span className="tabular" style={{ fontSize: 13, fontWeight: 700 }}>{g.hours}h</span>
            </div>
            {openProjectId === g.projectId && (
              <div className="col gap-6" style={{ marginTop: 12, paddingLeft: 26 }}>
                {g.entries.map((en) => {
                  const task = allTasks.find((t) => t.id === en.taskId);
                  return (
                    <div key={en.id} className="flex items-center gap-10" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                      <div className="grow">
                        <div style={{ fontSize: 12.5 }}>{en.date} — {task ? task.title : 'General'}</div>
                        {en.note && <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{en.note}</div>}
                      </div>
                      <span className="tabular" style={{ fontSize: 12.5, fontWeight: 700 }}>{en.hours}h</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
