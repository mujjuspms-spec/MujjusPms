import { useState } from 'react';
import TaskPanel from './TaskPanel';
import RoadmapTemplatePicker from './RoadmapTemplatePicker';
import TaskGraph from './TaskGraph/TaskGraph';
import { useTasksStore } from '../hooks/useTasksStore';
import { applyRoadmapTemplate, saveCustomTemplate } from '../services/roadmap';
import { PROJECTS } from '../services/projects';

const TEMPLATE_CATEGORIES = ['custom', 'fundraising', 'regulatory', 'clinical', 'product', 'commercial'];

// The interactive, ERD-style task/subtask hierarchy diagram for a single
// project — built straight from that project's real task tree. Embedded as
// the "Roadmap" tab on a project's own detail page.
export default function RoadmapTrack({ projectId, readOnly = false }) {
  const { tasksForProject, childrenOf, addTask, refresh } = useTasksStore();
  const [showGallery, setShowGallery] = useState(false);
  const [applying, setApplying] = useState(false);
  const [addingPhase, setAddingPhase] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [openTaskId, setOpenTaskId] = useState(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [templateCategory, setTemplateCategory] = useState('custom');
  const [templateRefreshKey, setTemplateRefreshKey] = useState(0);

  const project = PROJECTS.find((p) => p.id === projectId);
  const phases = tasksForProject(projectId);
  const gallery = !readOnly && (phases.length === 0 || showGallery);

  async function useTemplate(templateKey, phasesOverride) {
    setApplying(true);
    try {
      await applyRoadmapTemplate(projectId, templateKey, phasesOverride);
      await refresh();
      setShowGallery(false);
    } finally {
      setApplying(false);
    }
  }

  async function submitNewPhase() {
    if (!newTitle.trim()) return;
    await addTask({ project: projectId, title: newTitle.trim(), status: 'todo', due: 'Unscheduled' });
    setNewTitle('');
    setAddingPhase(false);
  }

  async function submitSaveTemplate() {
    if (!templateName.trim()) return;
    const builtPhases = phases.map((p) => ({
      title: p.title, description: p.desc || '',
      subtasks: childrenOf(p.id).map((k) => k.title),
    }));
    await saveCustomTemplate({
      name: templateName.trim(), description: templateDesc.trim(), category: templateCategory, phases: builtPhases,
    });
    setTemplateName(''); setTemplateDesc(''); setSavingTemplate(false);
    setTemplateRefreshKey((k) => k + 1);
  }

  return (
    <div>
      {phases.length > 0 && !readOnly && (
        <div className="flex items-center justify-end" style={{ marginBottom: 14, gap: 8 }}>
          {!showGallery && !savingTemplate && (
            <>
              {addingPhase ? (
                <div className="flex items-center gap-6">
                  <input
                    className="roadmap-edit-field" style={{ margin: 0, width: 200 }} placeholder="New task title" value={newTitle} autoFocus
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') submitNewPhase(); if (e.key === 'Escape') setAddingPhase(false); }}
                  />
                  <button className="btn btn-primary btn-sm" onClick={submitNewPhase}>Add</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setAddingPhase(false)}>Cancel</button>
                </div>
              ) : (
                <button className="btn btn-secondary btn-sm" onClick={() => setAddingPhase(true)}>Add task</button>
              )}
              <button className="btn btn-secondary btn-sm" onClick={() => setSavingTemplate(true)}>Save as template</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowGallery(true)}>Add from template</button>
            </>
          )}
          {(gallery || savingTemplate) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowGallery(false); setSavingTemplate(false); }}>Back to roadmap</button>
          )}
        </div>
      )}

      {savingTemplate && (
        <div className="roadmap-save-template-form">
          <h4 style={{ fontSize: 13.5, marginBottom: 10 }}>Save this roadmap as a reusable template</h4>
          <div className="field">
            <label>Template name</label>
            <input autoFocus value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="e.g. Our Series A playbook" />
          </div>
          <div className="field">
            <label>Description</label>
            <input value={templateDesc} onChange={(e) => setTemplateDesc(e.target.value)} placeholder="One line describing when to use this" />
          </div>
          <div className="field" style={{ maxWidth: 240 }}>
            <label>Category</label>
            <select value={templateCategory} onChange={(e) => setTemplateCategory(e.target.value)}>
              {TEMPLATE_CATEGORIES.map((c) => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <p style={{ fontSize: 11.5, color: 'var(--ink-muted)', margin: '4px 0 12px' }}>
            Captures this project's {phases.length} top-level task{phases.length === 1 ? '' : 's'} and their direct subtasks. Available to everyone in the workspace.
          </p>
          <button className="btn btn-primary btn-sm" disabled={!templateName.trim()} onClick={submitSaveTemplate}>Save template</button>
        </div>
      )}

      {gallery && (
        <>
          <p style={{ fontSize: 12.5, color: 'var(--ink-muted)', marginBottom: 14 }}>
            Pick a template to pre-fill this project's roadmap with real tasks and subtasks, or skip and add tasks manually.
          </p>
          <RoadmapTemplatePicker onPick={useTemplate} actionLabel={applying ? 'Applying…' : 'Use this template'} refreshKey={templateRefreshKey} />
        </>
      )}

      {readOnly && phases.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>No tasks yet.</p>
      )}

      {!gallery && !savingTemplate && !(readOnly && phases.length === 0) && (
        <TaskGraph projectId={projectId} project={project} topLevelTasks={phases} childrenOf={childrenOf} onOpenTask={setOpenTaskId} />
      )}

      {openTaskId && <TaskPanel taskId={openTaskId} onClose={() => setOpenTaskId(null)} />}
    </div>
  );
}
