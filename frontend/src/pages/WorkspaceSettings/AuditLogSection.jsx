import { useEffect, useMemo, useState } from 'react';
import { fetchAuditLog } from '../../services/audit';
import { person } from '../../services/people';
import { SectionCard } from './shared';

export default function AuditLogSection() {
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState(null);
  const [userFilter, setUserFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  function load() {
    setEntries(null);
    const params = {};
    if (userFilter !== 'ALL') params.userId = userFilter;
    if (actionFilter !== 'ALL') params.action = actionFilter;
    if (from) params.from = from;
    if (to) params.to = to;
    fetchAuditLog(params).then(setEntries).catch((e) => setError(e.message));
  }
  useEffect(load, [userFilter, actionFilter, from, to]);

  const actorOptions = useMemo(() => {
    const ids = new Set((entries || []).map((e) => e.actorId).filter(Boolean));
    return Array.from(ids);
  }, [entries]);
  const actionOptions = useMemo(() => {
    const set = new Set((entries || []).map((e) => e.action));
    return Array.from(set);
  }, [entries]);

  return (
    <SectionCard title="Audit Log" description="Every mutation in this workspace — who did what, and when.">
      <div className="flex gap-8" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
        <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} style={{ width: 160 }}>
          <option value="ALL">All users</option>
          {actorOptions.map((id) => <option key={id} value={id}>{person(id)?.name || id}</option>)}
        </select>
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} style={{ width: 180 }}>
          <option value="ALL">All actions</option>
          {actionOptions.map((a) => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ width: 150 }} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ width: 150 }} />
      </div>

      {error && <p style={{ fontSize: 12.5, color: 'var(--status-critical)' }}>{error}</p>}
      {!error && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: 'var(--surface-sunken)', textAlign: 'start' }}>
                <th style={{ padding: '9px 12px', fontWeight: 700 }}>When</th>
                <th style={{ padding: '9px 12px', fontWeight: 700 }}>User</th>
                <th style={{ padding: '9px 12px', fontWeight: 700 }}>Action</th>
                <th style={{ padding: '9px 12px', fontWeight: 700 }}>Target</th>
                <th style={{ padding: '9px 12px', fontWeight: 700 }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {(entries || []).map((e) => {
                const actor = person(e.actorId);
                return (
                  <tr key={e.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 12px', color: 'var(--ink-muted)', whiteSpace: 'nowrap' }}>{new Date(e.createdAt).toLocaleString()}</td>
                    <td style={{ padding: '8px 12px' }}>{actor?.name || e.actorId || 'System'}</td>
                    <td style={{ padding: '8px 12px', textTransform: 'capitalize' }}>{e.action.replace(/_/g, ' ')}</td>
                    <td style={{ padding: '8px 12px' }}>{e.entityType} <span style={{ color: 'var(--ink-muted)' }}>{e.entityId}</span></td>
                    <td style={{ padding: '8px 12px', color: 'var(--ink-muted)' }}>{JSON.stringify(e.detail)}</td>
                  </tr>
                );
              })}
              {entries && entries.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 16, textAlign: 'center', color: 'var(--ink-muted)' }}>No activity found for these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
