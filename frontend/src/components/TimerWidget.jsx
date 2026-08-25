import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { fetchActiveTimer, startTimer, stopTimer } from '../services/timer';
import { useTasksStore } from '../hooks/useTasksStore';
import { PROJECTS } from '../services/projects';

function elapsedLabel(startedAt) {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const h = String(Math.floor(secs / 3600)).padStart(2, '0');
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

// A persistent start/stop timer, always visible in the topbar — the
// "start/stop timer" gap-analysis item extends the manual TimesheetEntry
// logging already built: stopping writes a real logged entry.
export default function TimerWidget() {
  const { tasksForProject } = useTasksStore();
  const [timer, setTimer] = useState(null);
  const [tick, setTick] = useState(0);
  const [picking, setPicking] = useState(false);
  const [projectId, setProjectId] = useState(PROJECTS[0]?.id || '');
  const [taskId, setTaskId] = useState('');
  const [error, setError] = useState('');
  const intervalRef = useRef(null);

  useEffect(() => { fetchActiveTimer().then(setTimer); }, []);

  useEffect(() => {
    if (!timer) { clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(intervalRef.current);
  }, [timer]);

  async function start() {
    if (!projectId) return;
    setError('');
    try {
      const t = await startTimer(projectId, taskId || null);
      setTimer(t);
      setPicking(false);
    } catch (err) {
      setError(err.message || 'Could not start the timer');
    }
  }
  async function stop() {
    try {
      await stopTimer();
      setTimer(null);
    } catch (err) {
      setError(err.message || 'Could not stop the timer');
    }
  }

  const proj = timer && PROJECTS.find((p) => p.id === timer.projectId);
  const tasks = tasksForProject(projectId);

  if (timer) {
    return (
      <div className="flex items-center gap-8" style={{ background: 'var(--surface-2)', border: '1px solid var(--status-critical)', borderRadius: 8, padding: '5px 10px' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--status-critical)', animation: 'pulse 1.5s infinite' }} />
        <span className="tabular truncate" style={{ fontSize: 12.5, fontWeight: 700, maxWidth: 140 }} title={proj?.name}>{proj?.name}</span>
        <span className="tabular" style={{ fontSize: 12.5 }}>{elapsedLabel(timer.startedAt)}</span>
        <button className="btn-icon" title="Stop timer" onClick={stop}><Icon name="i-x" className="icon icon-sm" style={{ color: 'var(--status-critical)' }} /></button>
      </div>
    );
  }

  return (
    <div className="popover-wrap">
      <button className="btn-icon" title="Start timer" onClick={() => setPicking((p) => !p)}>
        <Icon name="i-clock" />
      </button>
      {picking && (
        <div className="popover popover-end" style={{ padding: 12, width: 260 }}>
          <div className="field" style={{ marginBottom: 8 }}>
            <label>Venture</label>
            <select value={projectId} onChange={(e) => { setProjectId(e.target.value); setTaskId(''); }}>
              {PROJECTS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 10 }}>
            <label>Task (optional)</label>
            <select value={taskId} onChange={(e) => setTaskId(e.target.value)}>
              <option value="">General</option>
              {tasks.map((tk) => <option key={tk.id} value={tk.id}>{tk.title}</option>)}
            </select>
          </div>
          {error && <p style={{ fontSize: 11.5, color: 'var(--status-critical)', marginBottom: 8 }}>{error}</p>}
          <button className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={start}>
            <Icon name="i-clock" className="icon icon-sm" /> Start timer
          </button>
        </div>
      )}
    </div>
  );
}
