import { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import Icon from '../components/Icon';

export default function AdminApprovals() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const res = await apiFetch('/api/admin/users');
      setUsers(res.users);
    } catch (e) {
      setError(e.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(id, action) {
    if (busyId) return;
    setBusyId(id);
    try {
      const { user } = await apiFetch(`/api/admin/users/${id}/${action}`, { method: 'POST' });
      setUsers(users.map((u) => (u.id === id ? user : u)));
    } catch (e) {
      alert(e.message || `Failed to ${action} user`);
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;

  const pending = users.filter((u) => u.approvalStatus === 'PENDING');
  const approved = users.filter((u) => u.approvalStatus === 'APPROVED');
  const rejected = users.filter((u) => u.approvalStatus === 'REJECTED');

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: 24, marginBottom: 24, fontWeight: 700 }}>Admin Approvals</h1>
      {error && <div style={{ color: 'var(--status-critical)', marginBottom: 20 }}>{error}</div>}

      <Section title={`Pending (${pending.length})`} users={pending} action={(id, act) => handleAction(id, act)} busyId={busyId} />
      <Section title={`Approved (${approved.length})`} users={approved} action={() => {}} busyId={busyId} />
      <Section title={`Rejected (${rejected.length})`} users={rejected} action={() => {}} busyId={busyId} />
    </div>
  );
}

function Section({ title, users, action, busyId }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 16, marginBottom: 12, fontWeight: 600, color: 'var(--ink-secondary)' }}>{title}</h2>
      {users.length === 0 ? (
        <p style={{ color: 'var(--ink-muted)', fontSize: 13 }}>No users.</p>
      ) : (
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {users.map((u, i) => (
            <div key={u.id} className="flex items-center justify-between" style={{ padding: '12px 16px', borderTop: i > 0 ? '1px solid var(--border)' : 'none', background: 'var(--surface-raised)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{u.name}</div>
                <div style={{ color: 'var(--ink-muted)', fontSize: 12.5 }}>{u.email}</div>
              </div>
              <div className="flex gap-8">
                {u.approvalStatus === 'PENDING' && (
                  <>
                    <button className="btn btn-sm btn-secondary" disabled={busyId === u.id} onClick={() => action(u.id, 'reject')} style={{ color: 'var(--status-critical)' }}>Reject</button>
                    <button className="btn btn-sm btn-primary" disabled={busyId === u.id} onClick={() => action(u.id, 'approve')}>Approve</button>
                  </>
                )}
                {u.approvalStatus === 'APPROVED' && <span className="pill pill-done">Approved</span>}
                {u.approvalStatus === 'REJECTED' && <span className="pill pill-critical">Rejected</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
