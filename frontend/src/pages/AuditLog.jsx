import { useEffect, useState } from 'react';
import { fetchAuditLog } from '../services/audit';
import { person } from '../services/people';
import { useI18n } from '../hooks/useI18n';

export default function AuditLog() {
  const { t } = useI18n();
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAuditLog().then(setEntries).catch((e) => setError(e.message));
  }, []);

  return (
    <section className="view">
      <div className="view-header">
        <div>
          <div className="view-title">Audit log</div>
          <div className="view-subtitle">Every mutation across the workspace — who did what, and when.</div>
        </div>
      </div>

      {error && <div className="card card-pad" style={{ color: 'var(--status-critical)', fontSize: 13 }}>{error}</div>}

      {!error && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: 'var(--surface-sunken)', textAlign: 'start' }}>
                <th style={{ padding: '9px 14px', fontWeight: 700 }}>When</th>
                <th style={{ padding: '9px 14px', fontWeight: 700 }}>Actor</th>
                <th style={{ padding: '9px 14px', fontWeight: 700 }}>Action</th>
                <th style={{ padding: '9px 14px', fontWeight: 700 }}>Entity</th>
                <th style={{ padding: '9px 14px', fontWeight: 700 }}>Detail</th>
              </tr>
            </thead>
            <tbody>
              {(entries || []).map((e) => {
                const actor = person(e.actorId);
                return (
                  <tr key={e.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 14px', color: 'var(--ink-muted)', whiteSpace: 'nowrap' }}>{new Date(e.createdAt).toLocaleString()}</td>
                    <td style={{ padding: '8px 14px' }}>{actor?.name || e.actorId}</td>
                    <td style={{ padding: '8px 14px', textTransform: 'capitalize' }}>{e.action.replace(/_/g, ' ')}</td>
                    <td style={{ padding: '8px 14px' }}>{e.entityType} <span style={{ color: 'var(--ink-muted)' }}>{e.entityId}</span></td>
                    <td style={{ padding: '8px 14px', color: 'var(--ink-muted)' }}>{JSON.stringify(e.detail)}</td>
                  </tr>
                );
              })}
              {entries && entries.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 16, textAlign: 'center', color: 'var(--ink-muted)' }}>No activity yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
