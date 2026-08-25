import { useState } from 'react';
import Icon from './Icon';
import AttachmentList from './AttachmentList';
import EditableMoney from './EditableMoney';
import EditableHours from './EditableHours';
import EditableText from './EditableText';
import EditableAssignee from './EditableAssignee';
import TaskCollaborators from './TaskCollaborators';
import { useTasksStore } from '../hooks/useTasksStore';
import { formatMinutes, remainingLabel, money } from '../utils/format';

export default function SubtaskNode({ task, depth = 0, readOnly = false }) {
  const { childrenOf, updateTaskStatus, updateTaskField, addSubtask, removeTask } = useTasksStore();
  const [expanded, setExpanded] = useState(true);
  const [showFiles, setShowFiles] = useState(false);
  const [showBudget, setShowBudget] = useState(false);
  const [showAssignee, setShowAssignee] = useState(false);
  const [showHours, setShowHours] = useState(false);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const children = childrenOf(task.id);
  const done = task.status === 'done';

  async function submitAdd() {
    if (!title.trim()) return;
    await addSubtask(task, title.trim());
    setTitle('');
    setAdding(false);
    setExpanded(true);
  }

  return (
    <div className="subnode" style={{ marginInlineStart: depth ? 18 : 0, borderInlineStart: depth ? '1px dashed var(--border)' : 'none', paddingInlineStart: depth ? 10 : 0 }}>
      <div className="flex items-center gap-8" style={{ padding: '5px 2px' }}>
        {children.length > 0 ? (
          <button className="btn-icon" style={{ width: 20, height: 20 }} onClick={() => setExpanded((v) => !v)}>
            <Icon name={expanded ? 'i-chevron-down' : 'i-chevron-end'} className="icon icon-sm" />
          </button>
        ) : <span style={{ width: 20, flex: '0 0 auto' }} />}
        <input type="checkbox" checked={done} disabled={readOnly} onChange={() => updateTaskStatus(task.id, done ? 'todo' : 'done')} />
        <div className="grow truncate">
          <EditableText
            value={task.title} onSave={(v) => v && updateTaskField(task.id, { title: v })}
            textStyle={{ fontSize: 13, textDecoration: done ? 'line-through' : 'none', color: done ? 'var(--ink-muted)' : 'var(--ink-primary)' }}
            readOnly={readOnly}
          />
        </div>
        <span
          onClick={() => setShowHours((v) => !v)}
          title="Estimated / logged hours — click to edit"
          style={{ fontSize: 11, color: 'var(--ink-muted)', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
        >
          {task.estimatedMinutes != null ? formatMinutes(task.estimatedMinutes) : '—'} / {formatMinutes(task.loggedMinutes)}
        </span>
        <button className="btn-icon" style={{ width: 22, height: 22 }} title="Assignee" onClick={() => setShowAssignee((v) => !v)}>
          <Icon name="i-id" className="icon icon-sm" />
        </button>
        <button className="btn-icon" style={{ width: 22, height: 22 }} title="Attachments" onClick={() => setShowFiles((v) => !v)}>
          <Icon name="i-paperclip" className="icon icon-sm" />
        </button>
        <button className="btn-icon" style={{ width: 22, height: 22 }} title="Budget" onClick={() => setShowBudget((v) => !v)}>
          <Icon name="i-wallet" className="icon icon-sm" />
        </button>
        {!readOnly && (
          <button className="btn-icon" style={{ width: 22, height: 22 }} title="Add sub-item" onClick={() => { setAdding(true); setExpanded(true); }}>
            <Icon name="i-plus" className="icon icon-sm" />
          </button>
        )}
        {!readOnly && (
          <button className="btn-icon" style={{ width: 22, height: 22 }} title="Delete" onClick={() => removeTask(task.id)}>
            <Icon name="i-trash" className="icon icon-sm" />
          </button>
        )}
      </div>

      {showAssignee && (
        <div className="col gap-6" style={{ marginInlineStart: 30, marginBottom: 8, fontSize: 11.5 }}>
          <div className="flex items-center gap-8">
            <span style={{ color: 'var(--ink-muted)' }}>Assignee</span>
            <EditableAssignee value={task.assignee} onSave={(v) => updateTaskField(task.id, { assignee: v })} size={18} readOnly={readOnly} />
          </div>
          <div className="flex items-center gap-8">
            <span style={{ color: 'var(--ink-muted)' }}>Also assigned</span>
            <TaskCollaborators taskId={task.id} compact readOnly={readOnly} />
          </div>
        </div>
      )}

      {showFiles && <div style={{ marginInlineStart: 30, marginBottom: 8 }}><AttachmentList taskId={task.id} compact /></div>}

      {showBudget && (
        <div className="flex items-center gap-14" style={{ marginInlineStart: 30, marginBottom: 8, fontSize: 11.5 }}>
          <span className="flex items-center gap-6" style={{ color: 'var(--ink-muted)' }}>
            Budget {task.budget == null && children.length > 0 && task.effectiveBudget != null ? (
              <span title="Calculated from subtasks">{money(task.effectiveBudget)}</span>
            ) : (
              <EditableMoney value={task.budget} onSave={(v) => updateTaskField(task.id, { budget: v })} placeholder="add" readOnly={readOnly} />
            )}
          </span>
          <span className="flex items-center gap-6" style={{ color: 'var(--ink-muted)' }}>
            Spent {task.spent == null && children.length > 0 && task.effectiveSpent > 0 ? (
              <span title="Calculated from subtasks">{money(task.effectiveSpent)}</span>
            ) : (
              <EditableMoney value={task.spent} onSave={(v) => updateTaskField(task.id, { spent: v })} placeholder="add" readOnly={readOnly} />
            )}
          </span>
          {task.effectiveBudget != null && (
            <span style={{ color: task.remainingBudget < 0 ? 'var(--status-critical)' : 'var(--ink-muted)' }}>
              Remaining {task.remainingBudget < 0 ? `Over by ${money(-task.remainingBudget)}` : money(task.remainingBudget)}
            </span>
          )}
        </div>
      )}

      {showHours && (
        <div className="flex items-center gap-14" style={{ marginInlineStart: 30, marginBottom: 8, fontSize: 11.5 }}>
          <span className="flex items-center gap-6" style={{ color: 'var(--ink-muted)' }}>Estimated <EditableHours value={task.estimatedMinutes} onSave={(v) => updateTaskField(task.id, { estimatedMinutes: v })} placeholder="add" readOnly={readOnly} /></span>
          <span style={{ color: 'var(--ink-muted)' }}>Logged {formatMinutes(task.loggedMinutes)}</span>
          {task.effectiveEstimatedMinutes != null && (
            <span style={{ color: task.remainingMinutes < 0 ? 'var(--status-critical)' : 'var(--ink-muted)' }}>
              Remaining {remainingLabel(task.remainingMinutes)}
            </span>
          )}
        </div>
      )}

      {adding && (
        <div className="flex gap-6" style={{ marginInlineStart: 30, marginBottom: 8 }}>
          <input
            autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submitAdd(); if (e.key === 'Escape') { setAdding(false); setTitle(''); } }}
            placeholder="Sub-item title"
            style={{ flex: 1, fontSize: 12.5, border: '1px solid var(--border-strong)', borderRadius: 6, padding: '4px 8px', background: 'var(--surface-2)', color: 'var(--ink-primary)' }}
          />
          <button className="btn btn-sm btn-primary" onClick={submitAdd}>Add</button>
          <button className="btn btn-sm btn-ghost" onClick={() => { setAdding(false); setTitle(''); }}>Cancel</button>
        </div>
      )}

      {expanded && children.map((c) => <SubtaskNode key={c.id} task={c} depth={depth + 1} readOnly={readOnly} />)}
    </div>
  );
}
