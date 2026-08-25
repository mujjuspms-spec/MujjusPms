import { useState } from 'react';
import Avatar from './Avatar';
import Icon from './Icon';
import { useI18n } from '../hooks/useI18n';
import { useTasksStore } from '../hooks/useTasksStore';
import { person } from '../services/people';
import { parseDate, TASK_STATUSES } from '../utils/format';

const COLUMNS = TASK_STATUSES;
const COL_ACCENT = {
  backlog: 'var(--ink-muted)', todo: 'var(--cat-1)', progress: 'var(--cat-2)',
  review: 'var(--cat-7)', done: 'var(--status-good)', blocked: 'var(--status-critical)',
};
const PRIO_ACCENT = { low: 'var(--cat-1)', medium: 'var(--cat-4)', high: 'var(--cat-2)', urgent: 'var(--status-critical)' };

function isOverdue(tk) {
  if (tk.status === 'done' || !tk.due || tk.due === 'Unscheduled') return false;
  const due = parseDate(tk.due);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return due < today;
}

export default function KanbanBoard({ tasks, onOpenTask, onAddTask, readOnly = false }) {
  const { t } = useI18n();
  const { updateTaskStatus } = useTasksStore();
  const [dragId, setDragId] = useState(null);
  const [overCol, setOverCol] = useState(null);

  function drop(status) {
    if (readOnly) return;
    const taskId = dragId;
    setDragId(null);
    setOverCol(null);
    if (!taskId) return;
    // No optimistic mutation happens here — the card stays put until the
    // store re-renders from a successful response, so a failed update just
    // leaves the card where it was (no separate "revert" step needed).
    updateTaskStatus(taskId, status).catch((err) => {
      window.alert(err.message || 'Could not update that task\'s status');
    });
  }

  return (
    <div className="flex gap-16" style={{ overflowX: 'auto', paddingBottom: 10 }}>
      {COLUMNS.map((col) => {
        const items = tasks.filter((tk) => tk.status === col);
        return (
          <div
            key={col}
            className={`kcol${overCol === col ? ' dragover' : ''}`}
            style={{ '--col-accent': COL_ACCENT[col] }}
            onDragOver={readOnly ? undefined : (e) => { e.preventDefault(); setOverCol(col); }}
            onDragLeave={readOnly ? undefined : () => setOverCol((c) => (c === col ? null : c))}
            onDrop={readOnly ? undefined : () => drop(col)}
          >
            <div className="kcol-head">
              <span className="kcol-dot" />
              <span className="kcol-title grow">{t(`status.${col}`)}</span>
              <span className="kcol-count">{items.length}</span>
              {!readOnly && onAddTask && (
                <button className="btn-icon" title={`Add task to ${t(`status.${col}`)}`} style={{ width: 20, height: 20 }} onClick={() => onAddTask(col)}>
                  <Icon name="i-plus" className="icon icon-sm" />
                </button>
              )}
            </div>
            <div className="kcol-body">
              {items.map((tk) => {
                const a = person(tk.assignee);
                const overdue = isOverdue(tk);
                return (
                  <div
                    key={tk.id}
                    className={`kcard${dragId === tk.id ? ' dragging' : ''}`}
                    style={{ '--card-accent': PRIO_ACCENT[tk.priority] }}
                    draggable={!readOnly}
                    onDragStart={readOnly ? undefined : () => setDragId(tk.id)}
                    onDragEnd={readOnly ? undefined : () => setDragId(null)}
                    onClick={() => onOpenTask(tk.id)}
                  >
                    <div className="kcard-title">{tk.title}</div>
                    <div className="kcard-tags">
                      <span className="kcard-prio" style={{ color: PRIO_ACCENT[tk.priority], background: `color-mix(in srgb, ${PRIO_ACCENT[tk.priority]} 16%, transparent)` }}>
                        <span className="dot" />{tk.priority}
                      </span>
                      {overdue && <span className="kcard-overdue"><Icon name="i-alert-t" className="icon icon-sm" style={{ width: 11, height: 11 }} />Overdue</span>}
                    </div>
                    <div className="kcard-foot">
                      <span className="kcard-due">{tk.due}</span>
                      <Avatar person={a} size={22} />
                    </div>
                  </div>
                );
              })}
              {items.length === 0 && <div className="kcol-empty">No tasks in {t(`status.${col}`)}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
