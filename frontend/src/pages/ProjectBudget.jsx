import { useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Icon from '../components/Icon';
import EditableMoney from '../components/EditableMoney';
import { useTasksStore } from '../hooks/useTasksStore';
import { useProjectPermissions } from '../hooks/useProjectPermissions';
import { project as getProject } from '../services/projects';
import { money } from '../utils/format';
import { budgetStatusFor, budgetStatusColor, computeProjectBudgetTotals } from '../utils/budget';

export default function ProjectBudget() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tasks: allTasks, updateTaskField } = useTasksStore();
  const proj = getProject(id);
  const tasks = useMemo(() => allTasks.filter((t) => t.project === id), [allTasks, id]);
  const { canEditTask } = useProjectPermissions(id);

  if (!proj) return <section className="view"><p>Project not found.</p></section>;

  // The one calculation both the top cards and the task-table footer use —
  // summed only over top-level tasks, since each one's effectiveBudget/
  // effectiveSpent already includes its own subtree (see utils/budget.js),
  // so nothing here can silently drift out of sync with the other.
  const totals = computeProjectBudgetTotals(tasks.filter((t) => !t.parentId), proj.budget);
  const over = totals.spent > totals.total && totals.total > 0;

  return (
    <section className="view">
      <div className="breadcrumb">
        <Link to="/budgets">Budgets</Link> / <b>{proj.name}</b>
      </div>

      <div className="view-header">
        <div>
          <div className="view-title">{proj.name}</div>
          <div className="view-subtitle">Budget overview</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/projects/${id}`)}>
          <Icon name="i-folder" className="icon icon-sm" /> Open project
        </button>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="stat-tile">
          <div className="s-label">Total budget</div>
          <div className="s-value tabular">{money(totals.total)}</div>
        </div>
        <div className="stat-tile">
          <div className="s-label">Total spent</div>
          <div className="s-value tabular">{money(totals.spent)}</div>
        </div>
        <div className="stat-tile">
          <div className="s-label">Remaining</div>
          <div className="s-value tabular" style={{ color: totals.remaining < 0 ? 'var(--status-critical)' : 'var(--ink-primary)' }}>{money(totals.remaining)}</div>
        </div>
        <div className="stat-tile">
          <div className="s-label">Status</div>
          <div className="s-value" style={{ fontSize: 16, color: budgetStatusColor(totals.status) }}>{totals.status}</div>
          <div className="meter" style={{ marginTop: 10 }}><span style={{ width: Math.min(100, totals.utilization) + '%', background: over ? 'var(--status-critical)' : 'var(--brand-500)' }} /></div>
        </div>
      </div>

      {totals.source === 'MANUAL' && (
        <div className="card card-pad" style={{ marginTop: 16, fontSize: 12.5 }}>
          <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 10 }}>
            <span style={{ color: 'var(--ink-muted)' }}>
              Project budget set manually — task budgets below are allocations inside it, not added on top.
            </span>
            <span className="flex gap-16 tabular">
              <span><span style={{ color: 'var(--ink-muted)' }}>Allocated to tasks</span> <b>{money(totals.taskAllocated)}</b></span>
              <span><span style={{ color: 'var(--ink-muted)' }}>Unallocated</span> <b style={{ color: totals.unallocated < 0 ? 'var(--status-critical)' : 'var(--ink-primary)' }}>{money(totals.unallocated)}</b></span>
            </span>
          </div>
          {totals.overallocated && (
            <p style={{ color: 'var(--status-critical)', fontWeight: 700, marginTop: 8 }}>
              Task allocations exceed project budget by {money(totals.overallocatedBy)}
            </p>
          )}
        </div>
      )}

      <div className="card card-pad" style={{ marginTop: 16 }}>
        <h3 style={{ fontSize: 14.5, marginBottom: 12 }}>Budget by task</h3>
        {tasks.length === 0 && <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>No tasks yet.</p>}
        {tasks.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--ink-muted)', fontSize: 11.5 }}>
                <th style={{ padding: '6px 10px' }}>Task</th>
                <th style={{ padding: '6px 10px' }}>Budget allocated</th>
                <th style={{ padding: '6px 10px' }}>Spent</th>
                <th style={{ padding: '6px 10px' }}>Remaining</th>
                <th style={{ padding: '6px 10px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((tk) => {
                // Editable cells stay bound to the task's own raw entry
                // (unchanged editing behavior); remaining/status reflect
                // its effective value, so a parent rolling up from
                // subtasks reads correctly even though its own budget
                // field is empty.
                const status = budgetStatusFor(tk.effectiveBudget, tk.effectiveSpent);
                return (
                  <tr key={tk.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '9px 10px' }}>{tk.parentId ? '↳ ' : ''}{tk.title}</td>
                    <td style={{ padding: '9px 10px' }}><EditableMoney value={tk.budget} onSave={(v) => updateTaskField(tk.id, { budget: v })} placeholder="—" readOnly={!canEditTask} /></td>
                    <td style={{ padding: '9px 10px' }}><EditableMoney value={tk.spent} onSave={(v) => updateTaskField(tk.id, { spent: v })} placeholder="—" readOnly={!canEditTask} /></td>
                    <td style={{ padding: '9px 10px' }} className="tabular">{tk.remainingBudget != null ? money(tk.remainingBudget) : '—'}</td>
                    <td style={{ padding: '9px 10px', color: budgetStatusColor(status), fontWeight: 700 }}>{status}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--border-strong)', fontWeight: 700 }}>
                <td style={{ padding: '9px 10px' }}>Total (top-level tasks)</td>
                <td style={{ padding: '9px 10px' }} className="tabular">{money(totals.total)}</td>
                <td style={{ padding: '9px 10px' }} className="tabular">{money(totals.spent)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </section>
  );
}
