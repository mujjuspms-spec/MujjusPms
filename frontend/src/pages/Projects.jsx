import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import Avatar from '../components/Avatar';
import { HealthLabel, HEALTH_META } from '../components/Pill';
import ProjectCard from '../components/ProjectCard';
import PortfolioTimeline from '../components/PortfolioTimeline';
import NewProjectModal from '../components/NewProjectModal';
import { useI18n } from '../hooks/useI18n';
import { useWorkspace } from '../hooks/useWorkspace';
import { useTasksStore } from '../hooks/useTasksStore';
import { PROJECTS } from '../services/projects';
import { person } from '../services/people';
import { money } from '../utils/format';
import { computeProjectBudgetTotals } from '../utils/budget';

const VIEWS = ['grid', 'list', 'board', 'timeline'];

export default function Projects() {
  const { t } = useI18n();
  const { isWorkspaceAdmin: isAdmin } = useWorkspace();
  const navigate = useNavigate();
  const { tasksForProject, loading } = useTasksStore();
  const [addOpen, setAddOpen] = useState(false);
  const [view, setView] = useState('grid');

  const columns = [
    { key: 'good', label: 'On track' },
    { key: 'warning', label: 'At risk' },
    { key: 'critical', label: 'Critical' },
  ];

  return (
    <section className="view">
      <div className="view-header">
        <div>
          <div className="view-title">{t('nav.projects')}</div>
          <div className="view-subtitle">{t('projidx.sub')}</div>
        </div>
        {isAdmin && (
          <button className="btn btn-primary btn-sm" onClick={() => setAddOpen(true)}>
            <Icon name="i-plus" className="icon icon-sm" /><span>{t('projidx.new')}</span>
          </button>
        )}
      </div>

      <div className="tabbar" style={{ marginBottom: 16 }}>
        {VIEWS.map((v) => (
          <button key={v} className={view === v ? 'active' : ''} onClick={() => setView(v)} style={{ textTransform: 'capitalize' }}>
            {v === 'board' ? 'Board' : v}
          </button>
        ))}
      </div>

      {view === 'grid' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {PROJECTS.map((p) => <ProjectCard key={p.id} project={p} tasks={tasksForProject(p.id)} />)}
        </div>
      )}

      {view === 'list' && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }} className="card">
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--ink-muted)', fontSize: 11.5 }}>
              <th style={{ padding: '10px 14px' }}>Project</th>
              <th style={{ padding: '10px 14px' }}>Owner</th>
              <th style={{ padding: '10px 14px' }}>Status</th>
              <th style={{ padding: '10px 14px' }}>Progress</th>
              <th style={{ padding: '10px 14px' }}>Tasks</th>
              <th style={{ padding: '10px 14px' }}>Due</th>
              <th style={{ padding: '10px 14px' }}>Budget</th>
            </tr>
          </thead>
          <tbody>
            {PROJECTS.map((p) => {
              const owner = person(p.ownerId);
              const tasks = tasksForProject(p.id);
              const done = tasks.filter((tk) => tk.status === 'done').length;
              const budgetTotals = computeProjectBudgetTotals(tasks, p.budget);
              return (
                <tr key={p.id} className="lgroup-row" style={{ cursor: 'pointer' }} onClick={() => navigate(`/projects/${p.id}`)}>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontWeight: 700 }}>{p.name}</td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-8"><Avatar person={owner} size={22} />{owner?.name}</div>
                  </td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}><HealthLabel health={p.health} /></td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', width: 140 }}>
                    <div className="meter"><span style={{ width: p.progress + '%' }} /></div>
                  </td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', color: 'var(--ink-muted)' }}>{done}/{tasks.length}</td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', color: 'var(--ink-muted)' }}>{p.due}</td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }} className="tabular">{money(budgetTotals.spent)} / {money(budgetTotals.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {view === 'board' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, alignItems: 'start' }}>
          {columns.map((col) => {
            const items = PROJECTS.filter((p) => p.health === col.key);
            return (
              <div key={col.key} className="col gap-10">
                <div className="flex items-center gap-8" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '.03em' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: HEALTH_META[col.key].color }} />
                  {col.label} <span style={{ color: 'var(--ink-muted)', fontWeight: 400 }}>{items.length}</span>
                </div>
                {items.map((p) => <ProjectCard key={p.id} project={p} tasks={tasksForProject(p.id)} />)}
                {items.length === 0 && <div style={{ fontSize: 12, color: 'var(--ink-muted)', padding: '8px 0' }}>No projects are currently {col.label.toLowerCase()}.</div>}
              </div>
            );
          })}
        </div>
      )}

      {view === 'timeline' && <PortfolioTimeline projects={PROJECTS} loading={loading} />}

      {addOpen && <NewProjectModal onClose={() => setAddOpen(false)} />}
    </section>
  );
}
