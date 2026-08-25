import { useNavigate } from 'react-router-dom';
import { HealthLabel } from './Pill';
import Avatar from './Avatar';
import { person } from '../services/people';
import { money } from '../utils/format';
import { computeProjectBudgetTotals } from '../utils/budget';

// `tasks` (optional): this project's own tasks, if the caller already has
// them loaded (Projects.jsx does, via useTasksStore) — powers the team
// avatar stack and task count without a second fetch.
export default function ProjectCard({ project, tasks }) {
  const navigate = useNavigate();
  const owner = person(project.ownerId);
  const crew = tasks
    ? Array.from(new Set([project.ownerId, ...tasks.map((t) => t.assignee)].filter(Boolean))).map(person).filter(Boolean)
    : null;
  const visibleCrew = crew?.slice(0, 3) || [];
  const overflowCount = crew ? Math.max(0, crew.length - visibleCrew.length) : 0;
  // Rolled up from this project's own tasks/subtasks (see utils/budget.js)
  // when the caller has them loaded — never the project's stored
  // budget/spent columns, so this can't disagree with the Budgets page.
  const budgetTotals = tasks ? computeProjectBudgetTotals(tasks, project.budget) : null;

  return (
    <div className="project-card col gap-10" onClick={() => navigate(`/projects/${project.id}`)}>
      <div className="flex items-center justify-between">
        <HealthLabel health={project.health} />
        <Avatar person={owner} size={24} />
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{project.name}</div>
        {project.client && <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 2 }}>{project.client}</div>}
      </div>
      <div className="meter"><span style={{ width: project.progress + '%' }} /></div>
      <div className="flex justify-between" style={{ fontSize: 11, color: 'var(--ink-muted)' }}>
        <span>{project.progress}% complete</span>
        <span>Due {project.due}</span>
      </div>
      {budgetTotals && budgetTotals.total > 0 && (
        <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{money(budgetTotals.spent)} of {money(budgetTotals.total)}</div>
      )}
      {tasks && (
        <div className="flex items-center justify-between" style={{ marginTop: 2 }}>
          <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{tasks.length} task{tasks.length === 1 ? '' : 's'}</span>
          {visibleCrew.length > 0 && (
            <div className="avatar-stack">
              {visibleCrew.map((p) => <Avatar key={p.id} person={p} size={20} />)}
              {overflowCount > 0 && <span className="avatar-overflow" style={{ width: 20, height: 20 }}>+{overflowCount}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
