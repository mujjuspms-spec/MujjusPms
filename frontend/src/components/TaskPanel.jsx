import { useState } from 'react';
import Icon from './Icon';
import AttachmentList from './AttachmentList';
import SubtaskNode from './SubtaskNode';
import EditableMoney from './EditableMoney';
import EditableHours from './EditableHours';
import EditableText from './EditableText';
import EditableDate from './EditableDate';
import EditableAssignee from './EditableAssignee';
import TaskCollaborators from './TaskCollaborators';
import CommentThread from './CommentThread';
import CustomFieldValues from './CustomFieldValues';
import TaskApproval from './TaskApproval';
import { useI18n } from '../hooks/useI18n';
import { useTasksStore } from '../hooks/useTasksStore';
import { useProjectPermissions } from '../hooks/useProjectPermissions';
import { project as getProject } from '../services/projects';
import { TASK_STATUSES as STATUSES, formatMinutes, remainingLabel, money } from '../utils/format';
import { budgetStatusFor, budgetStatusColor } from '../utils/budget';

export default function TaskPanel({ taskId, onClose }) {
  const { t } = useI18n();
  const { getTask, updateTaskStatus, updateTaskField, childrenOf, addSubtask, removeTask } = useTasksStore();
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const task = getTask(taskId);
  const { canEditTask, canDeleteTask, isReadOnly } = useProjectPermissions(task?.project);
  if (!task) return null;
  const proj = getProject(task.project);
  const children = childrenOf(task.id);
  const deps = (task.dependsOn || []).map((id) => getTask(id)).filter(Boolean);
  const blockedByDeps = deps.some((d) => d.status !== 'done');

  function changeStatus(s) {
    if (s === 'done' && blockedByDeps) {
      const names = deps.filter((d) => d.status !== 'done').map((d) => d.title).join(', ');
      if (!window.confirm(`This task depends on "${names}", which isn't done yet. Mark it done anyway?`)) return;
    }
    updateTaskStatus(task.id, s);
  }

  async function submitSubtask() {
    if (!subtaskTitle.trim()) return;
    // First subtask on this task: default to summing subtask estimates,
    // per the recommended default — but only ever set this once, so it
    // never silently overrides a mode the user already chose.
    if (children.length === 0 && task.hourCalculationMode !== 'SUM_OF_SUBTASKS') {
      await updateTaskField(task.id, { hourCalculationMode: 'SUM_OF_SUBTASKS' });
    }
    await addSubtask(task, subtaskTitle.trim());
    setSubtaskTitle('');
    setAddingSubtask(false);
  }

  async function deleteThisTask() {
    const label = children.length > 0 ? `"${task.title}" and its ${children.length} subtask${children.length === 1 ? '' : 's'}` : `"${task.title}"`;
    if (!window.confirm(`Delete ${label}? This can't be undone.`)) return;
    await removeTask(task.id);
    onClose();
  }

  return (
    <>
      <div id="task-panel-overlay" onClick={onClose} />
      <div id="task-panel">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{proj?.name}</div>
          <div className="flex items-center gap-4">
            {canDeleteTask && (
              <button className="btn-icon" title="Delete task" onClick={deleteThisTask}>
                <Icon name="i-trash" className="icon icon-sm" style={{ color: 'var(--status-critical)' }} />
              </button>
            )}
            <button className="btn-icon" onClick={onClose}><Icon name="i-x" className="icon icon-sm" /></button>
          </div>
        </div>
        <div className="col gap-16" style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
          <EditableText
            value={task.title} onSave={(v) => v && updateTaskField(task.id, { title: v })}
            textStyle={{ fontSize: 18, fontWeight: 700 }}
            readOnly={!canEditTask}
          />

          <div className="flex wrap gap-8">
            {STATUSES.map((s) => (
              <button
                key={s}
                className={`pill pill-${s}`}
                style={{ border: task.status === s ? '2px solid var(--brand-500)' : '1px solid transparent', cursor: canEditTask ? 'pointer' : 'default', opacity: canEditTask ? 1 : 0.7 }}
                onClick={canEditTask ? () => changeStatus(s) : undefined}
                disabled={!canEditTask}
              >
                <span className="dot" />{t(`status.${s}`)}
              </button>
            ))}
          </div>

          {deps.length > 0 && (
            <div className={blockedByDeps ? 'pill pill-blocked' : 'pill pill-done'} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, padding: '8px 12px' }}>
              <span style={{ fontWeight: 700, fontSize: 11.5 }}>{blockedByDeps ? 'Waiting on dependencies' : 'All dependencies complete'}</span>
              {deps.map((d) => <span key={d.id} style={{ fontSize: 11.5 }}>• {d.title} — {d.status}</span>)}
            </div>
          )}

          <div className="col gap-12" style={{ fontSize: 12.5 }}>
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--ink-muted)' }}>{t('common.assignee')}</span>
              <EditableAssignee value={task.assignee} onSave={(v) => updateTaskField(task.id, { assignee: v })} readOnly={!canEditTask} />
            </div>
            <div className="flex items-start justify-between gap-16">
              <span style={{ color: 'var(--ink-muted)', flexShrink: 0, paddingTop: 2 }}>Also assigned</span>
              <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                <TaskCollaborators taskId={task.id} readOnly={!canEditTask} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--ink-muted)' }}>{t('common.priority')}</span>
              <span className={`prio-${task.priority}`} style={{ fontWeight: 700, textTransform: 'capitalize' }}>{task.priority}</span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--ink-muted)' }}>Start date</span>
              <EditableDate value={task.start} onSave={(v) => updateTaskField(task.id, { start: v })} readOnly={!canEditTask} />
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--ink-muted)' }}>{t('common.due')}</span>
              <EditableDate value={task.due} onSave={(v) => updateTaskField(task.id, { due: v })} readOnly={!canEditTask} />
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--ink-muted)' }}>Estimated hours</span>
              {task.hourCalculationMode === 'SUM_OF_SUBTASKS' && children.length > 0 ? (
                <span title="Calculated from subtasks">{formatMinutes(task.effectiveEstimatedMinutes)}</span>
              ) : (
                <EditableHours value={task.estimatedMinutes} onSave={(v) => updateTaskField(task.id, { estimatedMinutes: v })} readOnly={!canEditTask} />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--ink-muted)' }}>Logged hours</span>
              <span>{formatMinutes(task.loggedMinutes)}</span>
            </div>
            {task.effectiveEstimatedMinutes != null && (
              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--ink-muted)' }}>Remaining hours</span>
                <span style={{ fontWeight: 700, color: task.remainingMinutes < 0 ? 'var(--status-critical)' : 'var(--ink-primary)' }}>
                  {remainingLabel(task.remainingMinutes)}
                </span>
              </div>
            )}
            {children.length > 0 && (
              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--ink-muted)' }}>Hour calculation</span>
                <select
                  value={task.hourCalculationMode}
                  onChange={(e) => updateTaskField(task.id, { hourCalculationMode: e.target.value })}
                  disabled={!canEditTask}
                  style={{ fontSize: 12.5, border: '1px solid var(--border-strong)', background: 'var(--surface-2)', borderRadius: 6, padding: '3px 7px' }}
                >
                  <option value="SUM_OF_SUBTASKS">Sum of subtasks</option>
                  <option value="MANUAL">Manual</option>
                </select>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--ink-muted)' }}>Repeat</span>
              <select
                value={task.recurrence?.freq || ''}
                onChange={(e) => updateTaskField(task.id, { recurrence: e.target.value ? { freq: e.target.value, interval: task.recurrence?.interval || 1, endDate: task.recurrence?.endDate } : null })}
                disabled={!canEditTask}
                style={{ fontSize: 12.5, border: '1px solid var(--border-strong)', background: 'var(--surface-2)', borderRadius: 6, padding: '3px 7px' }}
              >
                <option value="">Doesn't repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            {task.recurrence?.freq && (
              <>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--ink-muted)' }}>Every</span>
                  <span className="flex items-center gap-6">
                    <input
                      type="number" min={1} value={task.recurrence.interval || 1}
                      onChange={(e) => updateTaskField(task.id, { recurrence: { ...task.recurrence, interval: Math.max(1, Number(e.target.value) || 1) } })}
                      disabled={!canEditTask}
                      style={{ fontSize: 12.5, border: '1px solid var(--border-strong)', background: 'var(--surface-2)', borderRadius: 6, padding: '3px 7px', width: 56 }}
                    />
                    <span style={{ fontSize: 12.5 }}>{task.recurrence.freq === 'daily' ? 'day(s)' : task.recurrence.freq === 'weekly' ? 'week(s)' : 'month(s)'}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--ink-muted)' }}>Ends on</span>
                  <input
                    type="date" value={task.recurrence.endDate || ''}
                    onChange={(e) => updateTaskField(task.id, { recurrence: { ...task.recurrence, endDate: e.target.value || undefined } })}
                    disabled={!canEditTask}
                    style={{ fontSize: 12.5, border: '1px solid var(--border-strong)', background: 'var(--surface-2)', borderRadius: 6, padding: '3px 7px' }}
                  />
                </div>
              </>
            )}
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--ink-muted)' }}>Budget (USD)</span>
              {task.budget == null && children.length > 0 && task.effectiveBudget != null ? (
                <span title="Calculated from subtasks" className="tabular">{money(task.effectiveBudget)}</span>
              ) : (
                <EditableMoney value={task.budget} onSave={(v) => updateTaskField(task.id, { budget: v })} placeholder="Add budget" readOnly={!canEditTask} />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--ink-muted)' }}>Spent (USD)</span>
              {task.spent == null && children.length > 0 && task.effectiveSpent > 0 ? (
                <span title="Calculated from subtasks" className="tabular">{money(task.effectiveSpent)}</span>
              ) : (
                <EditableMoney value={task.spent} onSave={(v) => updateTaskField(task.id, { spent: v })} placeholder="Add spent" readOnly={!canEditTask} />
              )}
            </div>
            {task.effectiveBudget != null && (
              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--ink-muted)' }}>Budget status</span>
                <span style={{ fontWeight: 700, color: budgetStatusColor(budgetStatusFor(task.effectiveBudget, task.effectiveSpent)) }}>
                  {budgetStatusFor(task.effectiveBudget, task.effectiveSpent)}
                </span>
              </div>
            )}
          </div>

          <CustomFieldValues projectId={task.project} taskId={task.id} readOnly={!canEditTask} />

          <div>
            <h4 style={{ fontSize: 12.5, color: 'var(--ink-muted)', marginBottom: 8 }}>Approval</h4>
            <TaskApproval taskId={task.id} readOnly={!canEditTask} />
          </div>

          <div>
            <h4 style={{ fontSize: 12.5, color: 'var(--ink-muted)', marginBottom: 6 }}>Description</h4>
            <EditableText
              value={task.desc} onSave={(v) => updateTaskField(task.id, { desc: v })}
              multiline placeholder="Click to add a description"
              textStyle={{ fontSize: 13, lineHeight: 1.6 }}
              readOnly={!canEditTask}
            />
          </div>

          <div>
            <h4 style={{ fontSize: 12.5, color: 'var(--ink-muted)', marginBottom: 8 }}>Comments</h4>
            <CommentThread taskId={task.id} readOnly={!canEditTask} />
          </div>

          <div>
            <h4 style={{ fontSize: 12.5, color: 'var(--ink-muted)', marginBottom: 8 }}>Attachments</h4>
            <AttachmentList taskId={task.id} readOnly={!canEditTask} />
          </div>

          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <h4 style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>Subtasks · {children.length}</h4>
              {canEditTask && (
                <button className="btn btn-ghost btn-sm" style={{ padding: '3px 8px', fontSize: 11.5 }} onClick={() => setAddingSubtask(true)}>
                  <Icon name="i-plus" className="icon icon-sm" />Add subtask
                </button>
              )}
            </div>
            {addingSubtask && (
              <div className="flex gap-6" style={{ marginBottom: 8 }}>
                <input
                  autoFocus value={subtaskTitle} onChange={(e) => setSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitSubtask(); if (e.key === 'Escape') { setAddingSubtask(false); setSubtaskTitle(''); } }}
                  placeholder="Subtask title"
                  style={{ flex: 1, fontSize: 12.5, border: '1px solid var(--border-strong)', borderRadius: 6, padding: '5px 9px', background: 'var(--surface-2)', color: 'var(--ink-primary)' }}
                />
                <button className="btn btn-sm btn-primary" onClick={submitSubtask}>Add</button>
                <button className="btn btn-sm btn-ghost" onClick={() => { setAddingSubtask(false); setSubtaskTitle(''); }}>Cancel</button>
              </div>
            )}
            <div className="col">
              {children.map((c) => <SubtaskNode key={c.id} task={c} depth={0} readOnly={!canEditTask} />)}
              {children.length === 0 && !addingSubtask && <p style={{ fontSize: 12, color: 'var(--ink-muted)' }}>No subtasks yet — you can nest as many levels as you need (subtask → mini-subtask → super-mini-subtask → …).</p>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
