import { useState } from 'react';
import Avatar from '../components/Avatar';
import Pill from '../components/Pill';
import TaskPanel from '../components/TaskPanel';
import { useI18n } from '../hooks/useI18n';
import { useTasksStore } from '../hooks/useTasksStore';
import { PROJECTS } from '../services/projects';
import { person } from '../services/people';

export default function ListView() {
  const { t } = useI18n();
  const { tasksForProject } = useTasksStore();
  const [openTaskId, setOpenTaskId] = useState(null);

  return (
    <section className="view">
      <div className="view-header">
        <div>
          <div className="view-title">{t('nav.list')}</div>
          <div className="view-subtitle">Every task across the portfolio, grouped by venture.</div>
        </div>
      </div>

      <div className="col gap-20">
        {PROJECTS.map((p) => {
          const tasks = tasksForProject(p.id);
          if (!tasks.length) return null;
          return (
            <div key={p.id} className="card">
              <div style={{ padding: '12px 16px', fontWeight: 700, fontSize: 13, borderBottom: '1px solid var(--border)' }}>{p.name}</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <tbody>
                  {tasks.map((tk) => {
                    const a = person(tk.assignee);
                    return (
                      <tr key={tk.id} style={{ cursor: 'pointer' }} onClick={() => setOpenTaskId(tk.id)}>
                        <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}><Pill status={tk.status} /></td>
                        <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>{tk.title}</td>
                        <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                          <div className="flex items-center gap-8"><Avatar person={a} size={22} />{a?.name}</div>
                        </td>
                        <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                          <span className={`prio-${tk.priority}`} style={{ textTransform: 'capitalize', fontWeight: 700 }}>{tk.priority}</span>
                        </td>
                        <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', textAlign: 'end', color: 'var(--ink-muted)' }}>{tk.due}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
      {openTaskId && <TaskPanel taskId={openTaskId} onClose={() => setOpenTaskId(null)} />}
    </section>
  );
}
