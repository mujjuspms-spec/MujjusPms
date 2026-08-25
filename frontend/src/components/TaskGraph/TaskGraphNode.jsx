import { Handle, Position } from '@xyflow/react';
import Icon from '../Icon';

const STATUS_LABEL = { backlog: 'Backlog', todo: 'To do', progress: 'In progress', review: 'In review', done: 'Done', blocked: 'Blocked' };
const STATUS_COLOR = {
  backlog: 'var(--ink-muted)', todo: 'var(--cat-1)', progress: 'var(--cat-2)',
  review: 'var(--cat-7)', done: 'var(--status-good)', blocked: 'var(--status-critical)',
};
const PRIORITY_COLOR = {
  low: 'var(--cat-1)', medium: 'var(--cat-4)', high: 'var(--cat-2)', urgent: 'var(--status-critical)',
};

export default function TaskGraphNode({ data }) {
  const { task, isRoot, hasChildren, collapsed, childCount, onToggleCollapse, highlighted, dimmed } = data;

  if (isRoot) {
    return (
      <div className={`tg-card tg-card-root${highlighted ? ' highlighted' : ''}${dimmed ? ' dimmed' : ''}`}>
        <div className="tg-card-header">
          <div className="tg-card-header-left">
            <Icon name="i-folder" className="icon icon-sm tg-card-icon" />
            <span className="tg-card-title">{task.name}</span>
          </div>
        </div>
        <Handle id="source" type="source" position={Position.Bottom} className="tg-handle" />
      </div>
    );
  }

  return (
    <div
      className={`tg-card tg-card-task${highlighted ? ' highlighted' : ''}${dimmed ? ' dimmed' : ''}`}
      style={{ '--tg-accent': STATUS_COLOR[task.status] || 'var(--ink-muted)' }}
    >
      <Handle id="target" type="target" position={Position.Top} className="tg-handle" />
      <div className="tg-card-header">
        <div className="tg-card-header-left">
          <span className="tg-card-title" title={task.title}>{task.title}</span>
        </div>
        {hasChildren && (
          <button className="tg-card-toggle" onClick={(e) => { e.stopPropagation(); onToggleCollapse(); }} title={collapsed ? 'Expand' : 'Collapse'}>
            <Icon name={collapsed ? 'i-plus' : 'i-chevron-down'} className="icon" />
            {collapsed && <span className="tg-card-toggle-count">{childCount}</span>}
          </button>
        )}
      </div>
      <div className="tg-card-body">
        <div className="tg-field-row">
          <span className="tg-field-dot" style={{ background: STATUS_COLOR[task.status] || 'var(--ink-muted)' }} />
          <span className="tg-field-name">Status</span>
          <span className="tg-field-value">{STATUS_LABEL[task.status] || task.status}</span>
        </div>
        <div className="tg-field-row">
          <span className="tg-field-dot" style={{ background: PRIORITY_COLOR[task.priority] || 'var(--ink-muted)' }} />
          <span className="tg-field-name">Priority</span>
          <span className="tg-field-value">{task.priority}</span>
        </div>
        <div className="tg-field-row">
          <Icon name="i-clock" className="icon tg-field-icon" />
          <span className="tg-field-name">Due</span>
          <span className="tg-field-value">{task.due}</span>
        </div>
      </div>
      {hasChildren && <Handle id="source" type="source" position={Position.Bottom} className="tg-handle" />}
    </div>
  );
}
