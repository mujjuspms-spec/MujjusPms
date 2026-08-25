import { useEffect, useMemo, useState } from 'react';
import Icon from './Icon';
import { fetchTaskApprovals, requestApproval } from '../services/approvals';
import { person, PEOPLE } from '../services/people';
import { useAuth } from '../hooks/useAuth';

const STATUS_LABEL = { pending: 'Pending', waiting: 'Waiting', approved: 'Approved', rejected: 'Rejected' };
const STATUS_PILL = { pending: 'pill-progress', waiting: 'pill-backlog', approved: 'pill-done', rejected: 'pill-blocked' };

// A multi-step sign-off chain on a task: an ordered list of approvers
// sharing one groupId (see backend/src/routes/approvals.js). Only the
// current step is "pending" — later steps sit "waiting" until every prior
// step approves, and a rejection anywhere cascades the rest to "rejected".
export default function TaskApproval({ taskId, readOnly = false }) {
  const { user } = useAuth();
  const [approvals, setApprovals] = useState(null);
  const [picking, setPicking] = useState(false);
  const [picks, setPicks] = useState([]);
  const [nextPick, setNextPick] = useState('');

  function load() { fetchTaskApprovals(taskId).then(setApprovals); }
  useEffect(load, [taskId]);

  // The API returns every past chain for this task, newest first — group by
  // groupId and keep only the most recently-created group to display.
  const chain = useMemo(() => {
    if (!approvals?.length) return [];
    const groups = {};
    for (const a of approvals) (groups[a.groupId || a.id] ||= []).push(a);
    const latestKey = Object.keys(groups).reduce((best, k) => {
      const max = (list) => Math.max(...list.map((a) => new Date(a.createdAt).getTime()));
      return max(groups[k]) > max(groups[best]) ? k : best;
    }, Object.keys(groups)[0]);
    return groups[latestKey].slice().sort((a, b) => a.sequence - b.sequence);
  }, [approvals]);

  const active = chain.some((a) => a.status === 'pending' || a.status === 'waiting');
  const available = PEOPLE.filter((p) => p.id !== user?.id && !picks.includes(p.id));

  function startPicking() {
    setPicking(true);
    setPicks([]);
    setNextPick(available[0]?.id || '');
  }
  function addPick() {
    if (!nextPick) return;
    setPicks((ps) => [...ps, nextPick]);
    setNextPick('');
  }
  function removePick(id) {
    setPicks((ps) => ps.filter((p) => p !== id));
  }
  async function send() {
    if (picks.length === 0) return;
    await requestApproval(taskId, picks, '');
    setPicking(false);
    setPicks([]);
    load();
  }

  return (
    <div>
      {active ? (
        <div className="col gap-6">
          {chain.map((a, i) => (
            <div key={a.id} className="flex items-center gap-8" style={{ fontSize: 12.5 }}>
              <span style={{ width: 14, color: 'var(--ink-muted)', fontSize: 11 }}>{i + 1}.</span>
              <span className={`pill ${STATUS_PILL[a.status]}`}>{STATUS_LABEL[a.status]}</span>
              <span style={{ color: 'var(--ink-muted)' }}>{person(a.approverId)?.name}</span>
            </div>
          ))}
        </div>
      ) : picking && !readOnly ? (
        <div className="col gap-8">
          {picks.length > 0 && (
            <div className="col gap-4">
              {picks.map((pid, i) => (
                <div key={pid} className="flex items-center gap-8" style={{ fontSize: 12.5 }}>
                  <span style={{ width: 14, color: 'var(--ink-muted)', fontSize: 11 }}>{i + 1}.</span>
                  <span className="grow">{person(pid)?.name}</span>
                  <button className="btn-icon" onClick={() => removePick(pid)}><Icon name="i-x" className="icon icon-sm" /></button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-8">
            <select value={nextPick} onChange={(e) => setNextPick(e.target.value)} style={{ fontSize: 12.5, border: '1px solid var(--border-strong)', background: 'var(--surface-2)', borderRadius: 6, padding: '4px 8px' }}>
              <option value="">Add an approver…</option>
              {available.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button className="btn btn-secondary btn-sm" disabled={!nextPick} onClick={addPick}>Add step</button>
          </div>
          <div className="flex items-center gap-8">
            <button className="btn btn-primary btn-sm" disabled={picks.length === 0} onClick={send}>Request approval{picks.length > 1 ? ` (${picks.length} steps)` : ''}</button>
            <button className="btn-icon" onClick={() => setPicking(false)}><Icon name="i-x" className="icon icon-sm" /></button>
          </div>
        </div>
      ) : !readOnly ? (
        <button className="btn btn-secondary btn-sm" onClick={startPicking}><Icon name="i-shield" className="icon icon-sm" />Request approval</button>
      ) : null}
      {!active && chain.length > 0 && (
        <div className="col gap-4" style={{ marginTop: 6 }}>
          {chain.map((a) => (
            <div key={a.id} className="flex items-center gap-8" style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>
              <span className={a.status === 'approved' ? 'health-good' : 'health-critical'} style={{ fontWeight: 700 }}>{a.status}</span> by {person(a.approverId)?.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
