import { useEffect, useState } from 'react';
import Icon from './Icon';
import Avatar from './Avatar';
import { PEOPLE, person } from '../services/people';
import { fetchTaskCollaborators, addTaskCollaborator, removeTaskCollaborator } from '../services/tasks';

// Lets a task/subtask have more than one assignee — shown as a row of
// removable avatar chips plus an "add" control, self-fetching its own
// list like AttachmentList/CommentThread do.
export default function TaskCollaborators({ taskId, compact = false, readOnly = false }) {
  const [ids, setIds] = useState(null);
  const [adding, setAdding] = useState(false);
  const [pick, setPick] = useState('');

  useEffect(() => { setIds(null); fetchTaskCollaborators(taskId).then(setIds); }, [taskId]);

  async function add() {
    if (!pick) return;
    const next = await addTaskCollaborator(taskId, pick);
    setIds(next);
    setPick('');
    setAdding(false);
  }

  async function remove(userId) {
    const next = await removeTaskCollaborator(taskId, userId);
    setIds(next);
  }

  if (ids === null) return null;
  const people = ids.map(person).filter(Boolean);
  const available = PEOPLE.filter((p) => !ids.includes(p.id));
  const chipH = compact ? 18 : 22;
  const avatarSize = compact ? 15 : 18;
  const fontSize = compact ? 10.5 : 11.5;

  return (
    <div className="flex wrap items-center gap-6">
      {people.map((p) => (
        <span
          key={p.id}
          className="flex items-center gap-4"
          style={{ height: chipH, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 999, padding: '0 4px 0 3px' }}
        >
          <Avatar person={p} size={avatarSize} />
          <span style={{ fontSize }}>{p.name}</span>
          {!readOnly && (
            <button className="btn-icon" title="Remove" style={{ width: chipH - 4, height: chipH - 4 }} onClick={() => remove(p.id)}>
              <Icon name="i-x" style={{ width: 9, height: 9 }} />
            </button>
          )}
        </span>
      ))}

      {!readOnly && adding ? (
        <span className="flex items-center gap-4">
          <select
            autoFocus value={pick} onChange={(e) => setPick(e.target.value)}
            onBlur={() => { if (!pick) setAdding(false); }}
            style={{ fontSize: 11, border: '1px solid var(--brand-500)', borderRadius: 6, padding: '2px 5px', background: 'var(--surface-2)', color: 'var(--ink-primary)' }}
          >
            <option value="">Add…</option>
            {available.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {pick && (
            <button className="btn-icon" title="Confirm" style={{ width: chipH, height: chipH }} onClick={add}>
              <Icon name="i-check" style={{ width: 11, height: 11 }} />
            </button>
          )}
        </span>
      ) : (
        !readOnly && available.length > 0 && (
          <button className="btn-icon" title="Add assignee" style={{ width: chipH, height: chipH }} onClick={() => setAdding(true)}>
            <Icon name="i-plus" className="icon icon-sm" />
          </button>
        )
      )}

      {people.length === 0 && !adding && (
        <span style={{ fontSize, color: 'var(--ink-muted)' }}>No one else assigned</span>
      )}
    </div>
  );
}
