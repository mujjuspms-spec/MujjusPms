import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { useI18n } from '../hooks/useI18n';
import { useWorkspace } from '../hooks/useWorkspace';
import { PROJECTS } from '../services/projects';
import { fetchTimesheetSummary, timesheetExportUrl } from '../services/timesheets';

export default function Timesheets() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { isWorkspaceAdmin } = useWorkspace();
  const [totals, setTotals] = useState(null);

  useEffect(() => { fetchTimesheetSummary().then(setTotals); }, []);

  const hoursFor = (projectId) => totals?.find((row) => row.projectId === projectId)?.hours || 0;
  const totalHours = (totals || []).reduce((s, row) => s + row.hours, 0);

  return (
    <section className="view">
      <div className="view-header">
        <div>
          <div className="view-title">{t('nav.timesheets')}</div>
          <div className="view-subtitle">Time logged across the portfolio.</div>
        </div>
        {isWorkspaceAdmin && (
          <a className="btn btn-secondary btn-sm" href={timesheetExportUrl()}>
            <Icon name="i-download" className="icon icon-sm" /> Export all as .xlsx
          </a>
        )}
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="stat-tile">
          <div className="s-label">Total hours logged</div>
          <div className="s-value tabular">{totalHours}h</div>
        </div>
        <div className="stat-tile">
          <div className="s-label">Ventures with time logged</div>
          <div className="s-value tabular">{(totals || []).filter((row) => row.hours > 0).length}</div>
        </div>
        <div className="stat-tile">
          <div className="s-label">Ventures tracked</div>
          <div className="s-value tabular">{PROJECTS.length}</div>
        </div>
      </div>

      <div className="col gap-12">
        {PROJECTS.map((p) => {
          const hrs = hoursFor(p.id);
          const pct = totalHours ? Math.round((hrs / totalHours) * 100) : 0;
          return (
            <div key={p.id} className="card card-pad" style={{ cursor: 'pointer' }} onClick={() => navigate(`/projects/${p.id}?tab=timesheet`)}>
              <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{p.name}</div>
                <div style={{ fontSize: 12.5 }} className="tabular">{hrs}h logged</div>
              </div>
              <div className="meter"><span style={{ width: Math.min(100, pct) + '%' }} /></div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
