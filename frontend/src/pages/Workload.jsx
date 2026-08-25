import Avatar from '../components/Avatar';
import { useI18n } from '../hooks/useI18n';
import { useTasksStore } from '../hooks/useTasksStore';
import { PEOPLE } from '../services/people';

export default function Workload() {
  const { t } = useI18n();
  const { tasks } = useTasksStore();

  return (
    <section className="view">
      <div className="view-header">
        <div>
          <div className="view-title">{t('nav.workload')}</div>
          <div className="view-subtitle">Capacity vs. allocated hours per week.</div>
        </div>
      </div>

      <div className="card card-pad">
        <div className="col gap-16">
          {PEOPLE.map((p) => {
            const openTasks = tasks.filter((tk) => tk.assignee === p.id && tk.status !== 'done');
            // Real allocated hours — sum of each open task's own effective
            // estimate (a SUM_OF_SUBTASKS parent's effective value already
            // includes its subtree, so summing top-level-vs-subtask alike
            // here would double count; only count a task if its parent
            // ISN'T also assigned to the same person and rolling it up).
            const allocatedMinutes = openTasks.reduce((sum, tk) => {
              const parent = tk.parentId && tasks.find((t) => t.id === tk.parentId);
              const parentCovers = parent && parent.assignee === p.id && parent.hourCalculationMode === 'SUM_OF_SUBTASKS';
              return parentCovers ? sum : sum + (tk.effectiveEstimatedMinutes || 0);
            }, 0);
            const allocated = Math.round((allocatedMinutes / 60) * 10) / 10;
            const pct = Math.round((allocated / p.capacity) * 100);
            const over = pct > 100;
            return (
              <div key={p.id} className="wrow">
                <div className="flex items-center gap-10">
                  <Avatar person={p} size={30} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{p.role}</div>
                  </div>
                </div>
                <div className="wtrack">
                  <div className="wfill" style={{ width: Math.min(100, pct) + '%', background: over ? 'var(--status-critical)' : 'var(--brand-500)' }} />
                  <div className="wmark" style={{ left: '100%' }} />
                </div>
                <div style={{ textAlign: 'end', fontSize: 12.5 }}>
                  <div className="tabular" style={{ fontWeight: 700, color: over ? 'var(--status-critical)' : 'var(--ink-primary)' }}>{allocated}/{p.capacity}h</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{openTasks.length} open</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
