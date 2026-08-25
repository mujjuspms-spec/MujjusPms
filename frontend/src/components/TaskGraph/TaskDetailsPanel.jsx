import Icon from '../Icon';
import Avatar from '../Avatar';
import { HealthLabel } from '../Pill';

const STATUS_LABEL = { backlog: 'Backlog', todo: 'To do', progress: 'In progress', review: 'In review', done: 'Done', blocked: 'Blocked' };

function TeamList({ people }) {
  if (!people || people.length === 0) return <div className="tg-panel-empty">No members yet</div>;
  const shown = people.slice(0, 3);
  const rest = people.length - shown.length;
  return (
    <div className="col gap-8">
      {shown.map((p) => (
        <div key={p.id} className="flex items-center gap-8">
          <Avatar person={p} size={22} />
          <span style={{ fontSize: 12.5 }}>{p.name}</span>
        </div>
      ))}
      {rest > 0 && <div className="tg-panel-more">+{rest} more</div>}
    </div>
  );
}

export default function TaskDetailsPanel({ kind, task, project, depthLabel, ownerPerson, teamPeople, teamLoading, onClose, onViewFull }) {
  const isProject = kind === 'project';
  const title = isProject ? project?.name : task?.title;
  const typeLabel = isProject ? 'Project' : depthLabel;
  const status = isProject ? null : task?.status;
  const progress = isProject ? (project?.progress ?? 0) : (task?.progress ?? 0);

  return (
    <div className="tg-details-panel">
      <div className="tg-panel-head">
        <div>
          <div className="tg-panel-title">{title}</div>
          <span className="tg-panel-type">{typeLabel}</span>
        </div>
        <button className="btn-icon" onClick={onClose} aria-label="Close"><Icon name="i-x" className="icon icon-sm" /></button>
      </div>

      <div className="tg-panel-body">
        <div className="tg-panel-section">
          <div className="tg-panel-label"><Icon name="i-flag" />Status</div>
          {isProject ? <HealthLabel health={project?.health} /> : <span className={`pill pill-${status}`}>{STATUS_LABEL[status] || status}</span>}
        </div>

        {!isProject && task?.priority && (
          <div className="tg-panel-section">
            <div className="tg-panel-label"><Icon name="i-alert-t" />Priority</div>
            <span className={`tg-prio-pill prio-${task.priority}`} style={{ fontSize: 12.5 }}>{task.priority}</span>
          </div>
        )}

        <div className="tg-panel-section">
          <div className="tg-panel-label"><Icon name="i-activity" />Progress</div>
          <div className="flex items-center gap-8">
            <div className="meter grow"><span style={{ width: `${progress}%` }} /></div>
            <span className="tg-panel-pct">{progress}%</span>
          </div>
        </div>

        <div className="tg-panel-section">
          <div className="tg-panel-label"><Icon name="i-id" />Owner</div>
          {ownerPerson ? (
            <div className="flex items-center gap-8">
              <Avatar person={ownerPerson} size={24} />
              <span className="tg-panel-value">{ownerPerson.name}</span>
            </div>
          ) : (
            <div className="tg-panel-empty">Not assigned</div>
          )}
        </div>

        {isProject && (
          <div className="tg-panel-section">
            <div className="tg-panel-label"><Icon name="i-users" />Team</div>
            {teamLoading ? <div className="tg-panel-empty">Loading…</div> : <TeamList people={teamPeople} />}
          </div>
        )}

        {isProject ? (
          <>
            <div className="tg-panel-section">
              <div className="tg-panel-label"><Icon name="i-calendar" />Start Date</div>
              <div className="tg-panel-value">{project?.start || 'Unscheduled'}</div>
            </div>
            <div className="tg-panel-section">
              <div className="tg-panel-label"><Icon name="i-calendar" />End Date</div>
              <div className="tg-panel-value">{project?.due || 'Unscheduled'}</div>
            </div>
          </>
        ) : (
          <div className="tg-panel-section">
            <div className="tg-panel-label"><Icon name="i-clock" />Due Date</div>
            <div className="tg-panel-value">{task?.due || 'Unscheduled'}</div>
          </div>
        )}
      </div>

      <div className="tg-panel-foot">
        <button className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={onViewFull}>
          {isProject ? 'View Full Project' : 'View Full Task'}
        </button>
      </div>
    </div>
  );
}
