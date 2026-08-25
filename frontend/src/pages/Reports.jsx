import Icon from '../components/Icon';
import { HealthLabel } from '../components/Pill';
import { useI18n } from '../hooks/useI18n';
import { useTasksStore } from '../hooks/useTasksStore';
import { PROJECTS } from '../services/projects';
import { reportsExportUrl } from '../services/reports';
import { money, formatMinutes, remainingLabel } from '../utils/format';
import { computeProjectBudgetTotals } from '../utils/budget';

const HEALTH_COLOR = { good: 'var(--status-good)', warning: 'var(--status-warning)', critical: 'var(--status-critical)' };

export default function Reports() {
  const { t } = useI18n();
  const { tasksForProject } = useTasksStore();

  return (
    <section className="view">
      <div className="view-header">
        <div>
          <div className="view-title">{t('nav.reports')}</div>
          <div className="view-subtitle">Open work and spend, venture by venture.</div>
        </div>
        <a className="btn btn-secondary btn-sm" href={reportsExportUrl()}><Icon name="i-download" className="icon icon-sm" />{t('dash.export')}</a>
      </div>

      <div className="card card-pad">
        <h3 style={{ fontSize: 14.5, marginBottom: 14 }}>Open tasks by venture</h3>
        <div className="col gap-12">
          {PROJECTS.map((p) => {
            const open = tasksForProject(p.id).filter((tk) => tk.status !== 'done').length;
            const max = Math.max(...PROJECTS.map((pr) => tasksForProject(pr.id).filter((tk) => tk.status !== 'done').length), 1);
            return (
              <div key={p.id} className="flex items-center gap-12">
                <div style={{ flex: '0 0 170px', fontSize: 13 }} className="truncate">{p.name}</div>
                <div className="grow" style={{ height: 10, borderRadius: 5, background: 'var(--surface-sunken)', overflow: 'hidden' }}>
                  <div style={{ width: (open / max) * 100 + '%', height: '100%', background: HEALTH_COLOR[p.health] }} />
                </div>
                <div style={{ flex: '0 0 30px', textAlign: 'end', fontSize: 12.5 }} className="tabular">{open}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card card-pad" style={{ marginTop: 16 }}>
        <h3 style={{ fontSize: 14.5, marginBottom: 14 }}>Budget vs. spend</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'start', color: 'var(--ink-muted)', fontSize: 11.5 }}>
              <th style={{ padding: '6px 0', fontWeight: 700 }}>Venture</th>
              <th style={{ padding: '6px 0', fontWeight: 700 }}>Health</th>
              <th style={{ padding: '6px 0', fontWeight: 700, textAlign: 'end' }}>Budget (USD)</th>
              <th style={{ padding: '6px 0', fontWeight: 700, textAlign: 'end' }}>Spent (USD)</th>
              <th style={{ padding: '6px 0', fontWeight: 700, textAlign: 'end' }}>Remaining</th>
            </tr>
          </thead>
          <tbody>
            {PROJECTS.map((p) => {
              const totals = computeProjectBudgetTotals(tasksForProject(p.id), p.budget);
              return (
                <tr key={p.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '9px 0' }}>{p.name}</td>
                  <td style={{ padding: '9px 0' }}><HealthLabel health={p.health} /></td>
                  <td style={{ padding: '9px 0', textAlign: 'end' }} className="tabular">{money(totals.total)}</td>
                  <td style={{ padding: '9px 0', textAlign: 'end' }} className="tabular">{money(totals.spent)}</td>
                  <td style={{ padding: '9px 0', textAlign: 'end' }} className="tabular">{money(totals.remaining)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card card-pad" style={{ marginTop: 16 }}>
        <h3 style={{ fontSize: 14.5, marginBottom: 14 }}>Hours: estimated vs. logged</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'start', color: 'var(--ink-muted)', fontSize: 11.5 }}>
              <th style={{ padding: '6px 0', fontWeight: 700 }}>Venture</th>
              <th style={{ padding: '6px 0', fontWeight: 700, textAlign: 'end' }}>Estimated</th>
              <th style={{ padding: '6px 0', fontWeight: 700, textAlign: 'end' }}>Logged</th>
              <th style={{ padding: '6px 0', fontWeight: 700, textAlign: 'end' }}>Remaining</th>
            </tr>
          </thead>
          <tbody>
            {PROJECTS.map((p) => {
              // Only top-level tasks are summed — a SUM_OF_SUBTASKS parent's
              // own effectiveEstimatedMinutes already includes its whole
              // subtree, and a MANUAL parent's own value is authoritative
              // regardless of its subtasks — so descending further here
              // would double-count either way.
              const topLevel = tasksForProject(p.id);
              const estimated = topLevel.reduce((s, tk) => s + (tk.effectiveEstimatedMinutes || 0), 0);
              const logged = topLevel.reduce((s, tk) => s + (tk.loggedMinutes || 0), 0);
              const hasEstimate = topLevel.some((tk) => tk.effectiveEstimatedMinutes != null);
              return (
                <tr key={p.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '9px 0' }}>{p.name}</td>
                  <td style={{ padding: '9px 0', textAlign: 'end' }} className="tabular">{hasEstimate ? formatMinutes(estimated) : '—'}</td>
                  <td style={{ padding: '9px 0', textAlign: 'end' }} className="tabular">{formatMinutes(logged)}</td>
                  <td style={{ padding: '9px 0', textAlign: 'end' }} className="tabular">{hasEstimate ? remainingLabel(estimated - logged) : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
