import { useState } from 'react';
import KanbanBoard from '../components/KanbanBoard';
import TaskPanel from '../components/TaskPanel';
import { useI18n } from '../hooks/useI18n';
import { useTasksStore } from '../hooks/useTasksStore';
import { useProjectPermissions } from '../hooks/useProjectPermissions';
import { PROJECTS } from '../services/projects';

export default function Board() {
  const { t } = useI18n();
  const { tasksForProject } = useTasksStore();
  const [projectId, setProjectId] = useState(PROJECTS[0]?.id);
  const [openTaskId, setOpenTaskId] = useState(null);
  const { isReadOnly } = useProjectPermissions(projectId);

  return (
    <section className="view">
      <div className="view-header">
        <div>
          <div className="view-title">{t('nav.board')}</div>
          <div className="view-subtitle">Drag cards to move them across the workflow.</div>
        </div>
        <select className="proj-switcher" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          {PROJECTS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <KanbanBoard tasks={tasksForProject(projectId)} onOpenTask={setOpenTaskId} readOnly={isReadOnly} />
      {openTaskId && <TaskPanel taskId={openTaskId} onClose={() => setOpenTaskId(null)} />}
    </section>
  );
}
