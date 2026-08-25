import { useNavigate } from 'react-router-dom';
import { useI18n } from '../hooks/useI18n';
import { useTasksStore } from '../hooks/useTasksStore';
import { PROJECTS } from '../services/projects';
import { money } from '../utils/format';
import { computeProjectBudgetTotals, computeAllProjectsBudgetTotals } from '../utils/budget';

export default function Budgets() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { tasksForProject } = useTasksStore();

  // Computed live from each project's own tasks/subtasks — never the
  // project's stored budget/spent columns, which is exactly what left this
  // page permanently disconnected from real task data.
  const perProject = PROJECTS.map((p) => ({ project: p, totals: computeProjectBudgetTotals(tasksForProject(p.id), p.budget) }));
  const portfolio = computeAllProjectsBudgetTotals(perProject.map((x) => x.totals));

  return (
    <section className="view">
      <div className="view-header">
        <div>
          <div className="view-title">{t('nav.budget')}</div>
          <div className="view-subtitle">Portfolio budget utilization.</div>
        </div>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="stat-tile">
          <div className="s-label">Total budget</div>
          <div className="s-value tabular">{money(portfolio.total)}</div>
        </div>
        <div className="stat-tile">
          <div className="s-label">Total spent</div>
          <div className="s-value tabular">{money(portfolio.spent)}</div>
        </div>
        <div className="stat-tile">
          <div className="s-label">Utilization</div>
          <div className="s-value tabular">{portfolio.utilization}%</div>
          <div className="meter" style={{ marginTop: 10 }}><span style={{ width: Math.min(100, portfolio.utilization) + '%' }} /></div>
        </div>
      </div>

      <div className="col gap-12">
        {perProject.map(({ project: p, totals }) => (
          <div key={p.id} className="card card-pad" style={{ cursor: 'pointer' }} onClick={() => navigate(`/budgets/${p.id}`)}>
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{p.name}</div>
              <div style={{ fontSize: 12.5 }} className="tabular">{money(totals.spent)} / {money(totals.total)}</div>
            </div>
            <div className="meter"><span style={{ width: Math.min(100, totals.utilization) + '%', background: totals.utilization > 90 ? 'var(--status-critical)' : 'var(--brand-500)' }} /></div>
          </div>
        ))}
      </div>
    </section>
  );
}
