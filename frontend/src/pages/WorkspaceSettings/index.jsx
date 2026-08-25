import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import Avatar from '../../components/Avatar';
import { useWorkspace } from '../../hooks/useWorkspace';
import { fetchWorkspaceSettings } from '../../services/workspaceSettings';

import General, { workspaceAvatarProps } from './General';
import MembersPermissions from './MembersPermissions';
import ProjectAccess from './ProjectAccess';
import WorkSchedule from './WorkSchedule';
import ProjectDefaults from './ProjectDefaults';
import TaskWorkflow from './TaskWorkflow';
import TimesheetSettings from './TimesheetSettings';
import NotificationDefaults from './NotificationDefaults';
import Platform from './Platform';
import SecurityAccess from './SecurityAccess';
import AuditLogSection from './AuditLogSection';
import ImportExport from './ImportExport';
import DangerZone from './DangerZone';

const NAV = [
  { group: null, items: [{ slug: 'general', label: 'General' }] },
  {
    group: 'People', items: [
      { slug: 'members', label: 'Members & Permissions' },
      { slug: 'project-access', label: 'Project Access' },
      { slug: 'work-schedule', label: 'Work Schedule' },
    ],
  },
  {
    group: 'Work Management', items: [
      { slug: 'projects', label: 'Projects' },
      { slug: 'tasks', label: 'Tasks & Workflow' },
    ],
  },
  {
    group: 'Time & Activity', items: [
      { slug: 'timesheets', label: 'Timesheets' },
      { slug: 'notifications', label: 'Notifications' },
      { slug: 'audit-log', label: 'Audit Log' },
    ],
  },
  { group: 'Platform', items: [{ slug: 'platform', label: 'Integrations & API' }, { slug: 'import-export', label: 'Import / Export' }] },
  { group: 'Security', items: [{ slug: 'security', label: 'Security & Access' }] },
  { group: 'Advanced', items: [{ slug: 'danger-zone', label: 'Danger Zone' }] },
];

const SECTION_COMPONENTS = {
  general: General,
  members: MembersPermissions,
  'project-access': ProjectAccess,
  'work-schedule': WorkSchedule,
  projects: ProjectDefaults,
  tasks: TaskWorkflow,
  timesheets: TimesheetSettings,
  notifications: NotificationDefaults,
  platform: Platform,
  'import-export': ImportExport,
  security: SecurityAccess,
  'audit-log': AuditLogSection,
  'danger-zone': DangerZone,
};

export default function WorkspaceSettings() {
  const { section = 'general' } = useParams();
  const navigate = useNavigate();
  const { activeWorkspace, isWorkspaceAdmin } = useWorkspace();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  // Re-fetches whenever the active workspace changes, so switching
  // workspaces never leaves stale settings from the previous one on screen.
  useEffect(() => {
    if (!activeWorkspace?.id || !isWorkspaceAdmin) return;
    setData(null);
    fetchWorkspaceSettings(activeWorkspace.id).then(setData).catch((e) => setError(e.message));
  }, [activeWorkspace?.id, isWorkspaceAdmin]);

  if (!isWorkspaceAdmin) return <Navigate to="/dashboard" replace />;

  const Section = SECTION_COMPONENTS[section] || General;

  return (
    <section className="view">
      <div className="view-header">
        <div>
          <div className="view-title">Workspace Settings</div>
          <div className="view-subtitle">Manage your workspace, members, permissions, and defaults.</div>
        </div>
        {activeWorkspace && (
          <div className="flex items-center gap-8">
            <Avatar person={workspaceAvatarProps(activeWorkspace.name, data?.general?.logoUrl)} size={26} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>{activeWorkspace.name}</span>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px minmax(0,1fr)', gap: 20, alignItems: 'start' }}>
        <nav className="card card-pad" style={{ position: 'sticky', top: 16, padding: '10px 8px' }}>
          {NAV.map((g) => (
            <div key={g.group || 'root'} style={{ marginBottom: 10 }}>
              {g.group && <div className="nav-section-title" style={{ padding: '8px 10px 4px' }}>{g.group}</div>}
              {g.items.map((item) => (
                <button
                  key={item.slug}
                  onClick={() => navigate(`/settings/workspace/${item.slug}`)}
                  className={`btn btn-ghost btn-sm${section === item.slug ? ' active' : ''}`}
                  style={{
                    width: '100%', justifyContent: 'flex-start', textAlign: 'start', marginBottom: 2,
                    background: section === item.slug ? 'var(--surface-sunken)' : 'transparent',
                    fontWeight: section === item.slug ? 700 : 500,
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div>
          {error && <div className="card card-pad" style={{ color: 'var(--status-critical)', fontSize: 13, marginBottom: 14 }}>{error}</div>}
          {!error && !data && <div className="card card-pad" style={{ fontSize: 13, color: 'var(--ink-muted)' }}>Loading…</div>}
          {data && <Section data={data} setData={setData} workspaceId={activeWorkspace.id} />}
        </div>
      </div>
    </section>
  );
}
