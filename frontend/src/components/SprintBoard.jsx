import { useEffect, useState } from 'react';
import Icon from './Icon';
import Pill from './Pill';
import Avatar from './Avatar';
import { fetchSprints, createSprint, deleteSprint, fetchSprintVelocity, fetchSprintBurndown } from '../services/sprints';
import { useTasksStore } from '../hooks/useTasksStore';
import { person } from '../services/people';
import { STATUS_ORDER, STATUS_LABEL_KEY, formatDateInput } from '../utils/format';
import { useI18n } from '../hooks/useI18n';

function isActive(sprint) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return now >= new Date(sprint.startDate) && now <= new Date(sprint.endDate);
}

// Line chart of remaining vs. ideal, reconstructed from real task-status
// history (see GET /api/sprints/:id/burndown) — not illustrative data.
function BurndownChart({ days, total }) {
  if (!days?.length || total === 0) return <p style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>No tasks in this sprint yet.</p>;
  const W = 640, H = 200, padL = 32, padB = 20, padT = 10, padR = 10;
  const cw = W - padL - padR, ch = H - padT - padB;
  const x = (i) => padL + (days.length === 1 ? 0 : (i / (days.length - 1)) * cw);
  const y = (v) => padT + ch - (Math.min(v, total) / total) * ch;
  const line = (key) => days.map((d, i) => `${x(i)},${y(d[key])}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 200 }}>
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1={padL} x2={W - padR} y1={padT + ch * f} y2={padT + ch * f} stroke="var(--border)" strokeWidth="1" />
      ))}
      <text x={2} y={padT + 4} fontSize="9" fill="var(--ink-muted)">{total}</text>
      <text x={2} y={padT + ch} fontSize="9" fill="var(--ink-muted)">0</text>
      <polyline points={line('ideal')} fill="none" stroke="var(--ink-muted)" strokeWidth="1.5" strokeDasharray="4 4" />
      <polyline points={line('remaining')} fill="none" stroke="var(--brand-500)" strokeWidth="2.5" />
      {days.map((d, i) => <circle key={d.date} cx={x(i)} cy={y(d.remaining)} r="2.5" fill="var(--brand-500)" />)}
      <text x={padL} y={H - 4} fontSize="9" fill="var(--ink-muted)">{days[0].date}</text>
      <text x={W - padR} y={H - 4} fontSize="9" fill="var(--ink-muted)" textAnchor="end">{days[days.length - 1].date}</text>
    </svg>
  );
}

// Completed-vs-committed bars per sprint, oldest first — the classic
// velocity chart, driven by GET /api/sprints/velocity.
function VelocityChart({ sprints }) {
  if (!sprints?.length) return <p style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>No sprints yet.</p>;
  const max = Math.max(1, ...sprints.map((s) => s.total));
  return (
    <div className="flex items-end gap-16" style={{ height: 160, paddingTop: 10 }}>
      {sprints.map((s) => (
        <div key={s.sprintId} className="col items-center gap-6" style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-end gap-3" style={{ height: 110 }}>
            <div title={`${s.total} committed`} style={{ width: 16, height: `${(s.total / max) * 100}%`, background: 'var(--surface-3, var(--surface-2))', border: '1px solid var(--border)', borderRadius: '3px 3px 0 0' }} />
            <div title={`${s.completed} completed`} style={{ width: 16, height: `${(s.completed / max) * 100}%`, background: 'var(--status-good)', borderRadius: '3px 3px 0 0' }} />
          </div>
          <span className="tabular" style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{s.completed}/{s.total}</span>
          <span className="truncate" style={{ fontSize: 10.5, color: 'var(--ink-muted)', maxWidth: 70, textAlign: 'center' }}>{s.name}</span>
        </div>
      ))}
    </div>
  );
}

// A project's sprint planning + board — backlog (unassigned top-level
// tasks) on one side, the active sprint's tasks grouped by status like a
// mini Kanban on the other. Distinct from the always-on portfolio Board.
export default function SprintBoard({ projectId, readOnly = false }) {
  const { t } = useI18n();
  const { tasksForProject, updateTaskField } = useTasksStore();
  const [sprints, setSprints] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [goal, setGoal] = useState('');
  const [velocity, setVelocity] = useState(null);
  const [burndown, setBurndown] = useState(null);

  function load() {
    fetchSprints(projectId).then((rows) => {
      setSprints(rows);
      setSelectedId((cur) => cur || rows.find(isActive)?.id || rows[0]?.id || null);
    });
  }
  useEffect(load, [projectId]);

  const tasks = tasksForProject(projectId);
  const backlog = tasks.filter((tk) => !tk.sprintId);
  const selected = sprints?.find((s) => s.id === selectedId);
  const sprintTasks = selected ? tasks.filter((tk) => tk.sprintId === selected.id) : [];
  const doneCount = sprintTasks.filter((tk) => tk.status === 'done').length;

  // Re-pull whenever the live task list shifts (sprint assignment, status
  // change) — charts are derived from server-side history, not the store.
  const taskSignature = tasks.map((tk) => `${tk.id}:${tk.sprintId}:${tk.status}`).join('|');
  useEffect(() => { fetchSprintVelocity(projectId).then(setVelocity); }, [projectId, sprints, taskSignature]);
  useEffect(() => {
    if (!selectedId) { setBurndown(null); return; }
    fetchSprintBurndown(selectedId).then(setBurndown);
  }, [selectedId, taskSignature]);

  async function addSprint() {
    if (!name.trim() || !startDate || !endDate) return;
    const sprint = await createSprint({ projectId, name: name.trim(), startDate: formatDateInput(startDate), endDate: formatDateInput(endDate), goal });
    setName(''); setStartDate(''); setEndDate(''); setGoal(''); setCreating(false);
    setSprints((s) => [...(s || []), sprint]);
    setSelectedId(sprint.id);
  }
  async function removeSprint(id) {
    await deleteSprint(id);
    load();
  }
  function assignToSprint(taskId, sprintId) {
    updateTaskField(taskId, { sprintId: sprintId || null });
  }

  return (
    <div>
      <div className="flex items-center gap-10 wrap" style={{ marginBottom: 16 }}>
        {sprints?.map((s) => (
          <button
            key={s.id} className={`pill ${s.id === selectedId ? 'pill-progress' : 'pill-backlog'}`}
            style={{ cursor: 'pointer', border: 0 }} onClick={() => setSelectedId(s.id)}
          >
            {isActive(s) && <span className="dot" />}{s.name}
          </button>
        ))}
        {!readOnly && (
          <button className="btn btn-secondary btn-sm" onClick={() => setCreating((c) => !c)}><Icon name="i-plus" className="icon icon-sm" />New sprint</button>
        )}
      </div>

      {creating && !readOnly && (
        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <div className="field"><label>Sprint name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sprint 4" autoFocus /></div>
          <div className="flex gap-12 wrap">
            <div className="field"><label>Start</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
            <div className="field"><label>End</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
            <div className="field grow"><label>Goal (optional)</label><input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="What does done look like?" /></div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={addSprint}>Create sprint</button>
        </div>
      )}

      {sprints?.length === 0 && !creating && <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>No sprints yet — create one to start planning.</p>}

      {selected && (
        <>
          <div className="card card-pad" style={{ marginBottom: 16 }}>
            <div className="flex items-center justify-between">
              <div>
                <div style={{ fontWeight: 700, fontSize: 14.5 }}>{selected.name}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{selected.startDate} – {selected.endDate}{selected.goal ? ` · ${selected.goal}` : ''}</div>
              </div>
              <div className="flex items-center gap-10">
                <span className="tabular" style={{ fontSize: 12.5 }}>{doneCount}/{sprintTasks.length} done</span>
                {!readOnly && (
                  <button className="btn-icon" title="Delete sprint" onClick={() => removeSprint(selected.id)}><Icon name="i-trash" className="icon icon-sm" /></button>
                )}
              </div>
            </div>
            <div className="meter" style={{ marginTop: 10 }}><span style={{ width: sprintTasks.length ? Math.round((doneCount / sprintTasks.length) * 100) + '%' : '0%' }} /></div>
          </div>

          <div className="card card-pad" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14.5, marginBottom: 4 }}>Burndown</h3>
            <p style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginBottom: 8 }}>Remaining tasks vs. an ideal straight-line pace, from {selected.startDate} to {selected.endDate}.</p>
            <BurndownChart days={burndown?.days} total={burndown?.total ?? 0} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${STATUS_ORDER.length},1fr)`, gap: 12, marginBottom: 20 }}>
            {STATUS_ORDER.map((status) => (
              <div key={status} className="col gap-8">
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '.03em' }}>{t(STATUS_LABEL_KEY[status])}</div>
                {sprintTasks.filter((tk) => tk.status === status).map((tk) => {
                  const a = person(tk.assignee);
                  return (
                    <div key={tk.id} className="card card-pad" style={{ padding: 10 }}>
                      <div style={{ fontSize: 12.5, marginBottom: 6 }}>{tk.title}</div>
                      <div className="flex items-center justify-between">
                        <Avatar person={a} size={20} />
                        {!readOnly && (
                          <button className="btn-icon" title="Move to backlog" onClick={() => assignToSprint(tk.id, null)}><Icon name="i-x" className="icon icon-sm" /></button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14.5, marginBottom: 4 }}>Velocity</h3>
        <p style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginBottom: 4 }}>Completed vs. committed tasks per sprint, oldest first.</p>
        <VelocityChart sprints={velocity} />
      </div>

      <div className="card card-pad">
        <h3 style={{ fontSize: 14.5, marginBottom: 10 }}>Backlog</h3>
        <div className="col gap-8">
          {backlog.map((tk) => (
            <div key={tk.id} className="flex items-center gap-10" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <Pill status={tk.status} />
              <div className="grow truncate" style={{ fontSize: 13 }}>{tk.title}</div>
              {selected && !readOnly && <button className="btn btn-secondary btn-sm" onClick={() => assignToSprint(tk.id, selected.id)}>Add to {selected.name}</button>}
            </div>
          ))}
          {backlog.length === 0 && <p style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>Everything's assigned to a sprint.</p>}
        </div>
      </div>
    </div>
  );
}
