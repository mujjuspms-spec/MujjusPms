import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import Avatar from '../components/Avatar';
import { fetchMyApprovals, decideApproval } from '../services/approvals';
import { onRealtime } from '../services/realtime';
import { useTasksStore } from '../hooks/useTasksStore';
import { person } from '../services/people';

// Mirrors Zoho Projects' "My Approvals" — a formal sign-off queue distinct
// from just changing a task's status.
export default function MyApprovals() {
  const navigate = useNavigate();
  const { getTask } = useTasksStore();
  const [approvals, setApprovals] = useState(null);

  function load() { fetchMyApprovals().then(setApprovals); }
  useEffect(load, []);
  useEffect(() => onRealtime((msg) => { if (msg.type.startsWith('approval.')) load(); }), []);

  async function decide(a, status) {
    await decideApproval(a.id, status);
    load();
  }

  const pending = approvals?.filter((a) => a.status === 'pending') || [];
  const waiting = approvals?.filter((a) => a.status === 'waiting') || [];
  const decided = approvals?.filter((a) => a.status === 'approved' || a.status === 'rejected') || [];

  return (
    <section className="view">
      <div className="view-header">
        <div>
          <div className="view-title">My Approvals</div>
          <div className="view-subtitle">Sign-off requests waiting on you.</div>
        </div>
      </div>

      <div className="col gap-10" style={{ marginBottom: 24 }}>
        {approvals === null && <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>Loading…</p>}
        {pending.length === 0 && approvals !== null && <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>Nothing pending — you're caught up.</p>}
        {pending.map((a) => {
          const task = getTask(a.taskId);
          const requester = person(a.requestedById);
          return (
            <div key={a.id} className="card card-pad">
              <div className="flex items-center gap-10" style={{ marginBottom: 8 }}>
                <Avatar person={requester} size={24} />
                <div className="grow">
                  <div style={{ fontSize: 13 }}><b>{requester?.name}</b> requested your approval</div>
                  <div style={{ fontSize: 12, color: 'var(--brand-600)', cursor: 'pointer' }} onClick={() => task && navigate(`/projects/${task.project}`)}>{task?.title || 'Task'}</div>
                </div>
              </div>
              {a.note && <p style={{ fontSize: 12.5, color: 'var(--ink-muted)', marginBottom: 10 }}>{a.note}</p>}
              <div className="flex gap-8">
                <button className="btn btn-primary btn-sm" onClick={() => decide(a, 'approved')}><Icon name="i-check-c" className="icon icon-sm" />Approve</button>
                <button className="btn btn-secondary btn-sm" onClick={() => decide(a, 'rejected')}><Icon name="i-x" className="icon icon-sm" />Reject</button>
              </div>
            </div>
          );
        })}
      </div>

      {waiting.length > 0 && (
        <>
          <h3 style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 10 }}>Waiting on earlier approvers</h3>
          <div className="col gap-8" style={{ marginBottom: 24 }}>
            {waiting.map((a) => {
              const task = getTask(a.taskId);
              const requester = person(a.requestedById);
              return (
                <div key={a.id} className="flex items-center gap-10" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span className="pill pill-backlog">Waiting</span>
                  <div className="grow" style={{ fontSize: 12.5 }}>{task?.title} — requested by {requester?.name}</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {decided.length > 0 && (
        <>
          <h3 style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 10 }}>Past decisions</h3>
          <div className="col gap-8">
            {decided.map((a) => {
              const task = getTask(a.taskId);
              const requester = person(a.requestedById);
              return (
                <div key={a.id} className="flex items-center gap-10" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span className={`pill ${a.status === 'approved' ? 'pill-done' : 'pill-blocked'}`}>{a.status}</span>
                  <div className="grow" style={{ fontSize: 12.5 }}>{task?.title} — requested by {requester?.name}</div>
                  <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{new Date(a.decidedAt).toLocaleDateString()}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
