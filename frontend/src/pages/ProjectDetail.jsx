import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import Icon from '../components/Icon';
import Avatar from '../components/Avatar';
import Pill from '../components/Pill';
import BuildWidget from '../components/BuildWidget';
import GanttChart from '../components/GanttChart';
import KanbanBoard from '../components/KanbanBoard';
import TaskPanel from '../components/TaskPanel';
import ProjectTimesheet from '../components/ProjectTimesheet';
import QuickAddModal from '../components/QuickAddModal';
import RoadmapTrack from '../components/RoadmapTrack';
import IssueList from '../components/IssueList';
import SprintBoard from '../components/SprintBoard';
import ChatPanel from '../components/ChatPanel';
import CustomFieldsPanel from '../components/CustomFieldsPanel';
import SaveAsTemplateModal from '../components/SaveAsTemplateModal';
import EditProjectModal from '../components/EditProjectModal';
import AddTeamMemberModal from '../components/AddTeamMemberModal';
import { enableShare, disableShare } from '../services/share';
import { useI18n } from '../hooks/useI18n';
import { useAuth } from '../hooks/useAuth';
import { useWorkspace } from '../hooks/useWorkspace';
import { useTasksStore } from '../hooks/useTasksStore';
import { useProjectPermissions } from '../hooks/useProjectPermissions';
import {
  PROJECTS, project as getProject, fetchProjects, fetchProjectMembers, addProjectMember, removeProjectMember,
  updateProject, deleteProject, archiveProject, unarchiveProject,
} from '../services/projects';
import { fetchWorkspaceMembers } from '../services/workspaces';
import { fetchAttachments, deleteAttachment } from '../services/tasks';
import { downloadUrl } from '../services/api';
import { useToast } from '../components/Toast';
import { onRealtime } from '../services/realtime';
import { PEOPLE, person } from '../services/people';
import EditableMoney from '../components/EditableMoney';
import { money, parseDate, STATUS_ORDER, STATUS_LABEL_KEY } from '../utils/format';

const STATUS_COLOR = {
  backlog: 'var(--ink-muted)', todo: 'var(--cat-1)', progress: 'var(--cat-2)',
  review: 'var(--cat-7)', done: 'var(--status-good)',
};

export default function ProjectDetail() {
  const { id } = useParams();
  const { t } = useI18n();
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const { tasks: allTasks, tasksForProject, childrenOf, getTask, criticalPathFor } = useTasksStore();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'overview');
  const [openTaskId, setOpenTaskId] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addDefaultStatus, setAddDefaultStatus] = useState(null);
  const [newMemberId, setNewMemberId] = useState('');
  const [members, setMembers] = useState([]);
  const [wsRoleByUserId, setWsRoleByUserId] = useState({});
  const [accessRevoked, setAccessRevoked] = useState(false);
  const [files, setFiles] = useState(null);
  const perms = useProjectPermissions(id);
  const [, bump] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareToken, setShareToken] = useState(null);
  const [shareExpiresAt, setShareExpiresAt] = useState(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareDays, setShareDays] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);
  const [collapsedIds, setCollapsedIds] = useState(() => new Set());
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  function toggleGanttCollapse(taskId) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId); else next.add(taskId);
      return next;
    });
  }

  const { show: showToast } = useToast();
  const proj = getProject(id);
  async function saveProjectField(patch) {
    try {
      await updateProject(id, patch);
      bump((n) => n + 1);
    } catch (e) {
      showToast(e.message || 'Could not save this change', 'critical');
    }
  }
  const tasks = tasksForProject(id); // top-level only — boards/gantt/milestones operate on these
  const projectTasksAllDepth = useMemo(() => allTasks.filter((tk) => tk.project === id), [allTasks, id]);

  useEffect(() => { fetchProjectMembers(id).then(setMembers); }, [id]);

  // Each teammate's write-vs-read-only status on this project comes from
  // their WORKSPACE role now, not a per-project role — fetched once to
  // label the Team tab (Admin/Member/Viewer), not re-derived per project.
  useEffect(() => {
    if (!activeWorkspace?.id) return;
    fetchWorkspaceMembers(activeWorkspace.id).then((rows) => {
      setWsRoleByUserId(Object.fromEntries(rows.map((m) => [m.userId, m.role])));
    });
  }, [activeWorkspace?.id]);

  // If an Admin changes this project's membership (adds/removes/re-roles
  // someone) while it's open, refresh so permissions update immediately —
  // per the RBAC spec's "role change takes effect immediately" requirement.
  useEffect(() => onRealtime(async (msg) => {
    if (msg.type !== 'project.access.changed' || msg.payload.projectId !== id) return;
    fetchProjectMembers(id).then(setMembers);
    if (msg.payload.userId === user?.id) {
      await fetchProjects();
      if (!getProject(id)) { setAccessRevoked(true); return; }
      bump((n) => n + 1);
    }
  }), [id, user?.id]);

  useEffect(() => {
    if (!accessRevoked) return;
    const timer = setTimeout(() => navigate('/projects'), 1500);
    return () => clearTimeout(timer);
  }, [accessRevoked, navigate]);

  useEffect(() => {
    if (tab !== 'files') return;
    setFiles(null);
    Promise.all(projectTasksAllDepth.map((tk) => fetchAttachments(tk.id).then((atts) => atts.map((a) => ({ ...a, taskTitle: tk.title })))))
      .then((groups) => setFiles(groups.flat()));
  }, [tab, projectTasksAllDepth]);

  if (accessRevoked) {
    return <section className="view"><p>You no longer have access to this project.</p></section>;
  }
  if (!proj) return <section className="view"><p>Project not found.</p></section>;

  const owner = person(proj.ownerId);
  const doneCount = tasks.filter((tk) => tk.status === 'done').length;
  const totalCount = tasks.length;
  const memberIds = members.map((m) => m.userId);

  const teamIds = useMemo(() => {
    const ids = new Set([proj.ownerId, ...memberIds]);
    tasks.forEach((tk) => ids.add(tk.assignee));
    return Array.from(ids);
  }, [proj, tasks, members]);

  const crew = teamIds.map((pid) => person(pid)).filter(Boolean);
  const availableToAdd = PEOPLE.filter((p) => !teamIds.includes(p.id));

  async function addMember() {
    if (!newMemberId) return;
    const updated = await addProjectMember(id, newMemberId);
    setMembers(updated);
    setNewMemberId('');
  }

  async function removeMember(pid) {
    const updated = await removeProjectMember(id, pid);
    setMembers(updated);
  }

  async function toggleShare() {
    setShareOpen((o) => !o);
  }
  async function turnOnShare() {
    setShareBusy(true);
    const { token, expiresAt } = await enableShare(id, shareDays || null).finally(() => setShareBusy(false));
    setShareToken(token);
    setShareExpiresAt(expiresAt);
    bump((n) => n + 1);
  }
  async function turnOffShare() {
    setShareBusy(true);
    await disableShare(id).finally(() => setShareBusy(false));
    setShareToken(null);
    setShareExpiresAt(null);
    bump((n) => n + 1);
  }

  async function removeProject() {
    if (!window.confirm(`Delete "${proj.name}"? This permanently deletes all its tasks, subtasks, comments and files. This can't be undone.`)) return;
    await deleteProject(id);
    navigate('/projects');
  }

  async function toggleArchive() {
    if (proj.isArchived) await unarchiveProject(id);
    else await archiveProject(id);
    bump((n) => n + 1);
  }

  const distribution = STATUS_ORDER.map((s) => ({
    status: s, count: tasks.filter((tk) => tk.status === s).length,
  }));

  const milestones = [...tasks].filter((t) => t.due && t.due !== 'Unscheduled').sort((a, b) => parseDate(a.due) - parseDate(b.due)).slice(0, 4);
  const ganttMilestones = milestones.map((m) => ({ id: m.id, title: m.title, due: parseDate(m.due), dueLabel: m.due, status: m.status }));

  const criticalIds = criticalPathFor(id);
  // Depth-first, hierarchy-preserving row list for the Gantt — every task at
  // every depth (not just top-level), skipping the subtree under a collapsed
  // parent. Real task.start is used where set; only fabricated (due - 18d)
  // for tasks that never had a start date, same fallback the old flat Gantt used.
  const ganttRows = useMemo(() => {
    const rows = [];
    function walk(task, depth) {
      const children = childrenOf(task.id);
      const hasChildren = children.length > 0;
      const collapsed = collapsedIds.has(task.id);
      const end = parseDate(task.due);
      let start;
      if (task.start && task.start !== 'Unscheduled') {
        start = parseDate(task.start);
      } else {
        start = new Date(end); start.setDate(start.getDate() - 18);
        const projStart = parseDate(proj.start);
        if (start < projStart) start = projStart;
      }
      rows.push({
        id: task.id, label: task.title, start, end, progress: task.progress,
        color: STATUS_COLOR[task.status] || 'var(--brand-500)',
        critical: criticalIds.has(task.id),
        dependsOnLabels: (task.dependsOn || []).map((dId) => getTask(dId)?.title).filter(Boolean),
        dependsOn: task.dependsOn || [],
        depth, hasChildren, collapsed, ownerId: task.assignee,
      });
      if (hasChildren && !collapsed) children.forEach((c) => walk(c, depth + 1));
    }
    tasks.forEach((t) => walk(t, 0));
    return rows;
  }, [tasks, allTasks, collapsedIds, criticalIds, proj.start]);

  return (
    <section className="view">
      <div className="breadcrumb">
        <Link to="/projects">{t('crumb.projects')}</Link> / <b>{proj.name}</b>
        <select className="proj-switcher" value={proj.id} onChange={(e) => navigate(`/projects/${e.target.value}`)}>
          {PROJECTS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="view-header">
        <div className="flex gap-16 items-center">
          <svg width="58" height="58" viewBox="0 0 58 58" style={{ flex: '0 0 auto' }}>
            <circle cx="29" cy="29" r="24" fill="none" stroke="var(--surface-sunken)" strokeWidth="6" />
            <circle cx="29" cy="29" r="24" fill="none" stroke="var(--brand-500)" strokeWidth="6" strokeLinecap="round"
              strokeDasharray="150.8" strokeDashoffset={150.8 - (150.8 * proj.progress) / 100} transform="rotate(-90 29 29)" />
            <text x="29" y="34" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--ink-primary)">{proj.progress}%</text>
          </svg>
          <div>
            <div className="view-title">{proj.name}</div>
            <div className="view-subtitle">{proj.desc}</div>
            <div className="flex gap-10 items-center" style={{ marginTop: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{proj.client}</span>
              <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>· Due {proj.due}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-8">
          <div className="avatar-stack">
            {teamIds.map((pid) => { const p = person(pid); return p ? <Avatar key={pid} person={p} size={30} /> : null; })}
          </div>
          {perms.canEditProject && (
          <div className="popover-wrap">
            <button className="btn btn-secondary btn-sm" onClick={toggleShare}><Icon name="i-link" className="icon icon-sm" />{t('proj.share')}</button>
            {shareOpen && (
              <div className="popover popover-end" style={{ padding: 14, width: 320 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Public read-only link</div>
                {(shareToken || proj.publicShareToken) ? (
                  <>
                    <p style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginBottom: 8 }}>Anyone with this link can view progress and tasks — no login, no editing.</p>
                    <div className="flex items-center gap-8" style={{ marginBottom: 8 }}>
                      <code style={{ flex: 1, fontSize: 11, wordBreak: 'break-all', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px' }}>
                        {window.location.origin}/share/{shareToken || proj.publicShareToken}
                      </code>
                      <button className="btn btn-secondary btn-sm" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/share/${shareToken || proj.publicShareToken}`)}>Copy</button>
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--ink-muted)', marginBottom: 10 }}>
                      {(shareExpiresAt || proj.publicShareExpiresAt)
                        ? `Expires ${new Date(shareExpiresAt || proj.publicShareExpiresAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`
                        : 'Never expires'}
                    </p>
                    <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} disabled={shareBusy} onClick={turnOffShare}>Revoke link</button>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginBottom: 10 }}>Generate a link anyone can open to see this project's progress and tasks — no account needed.</p>
                    <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                      <span style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>Expires</span>
                      <select
                        value={shareDays} onChange={(e) => setShareDays(e.target.value)}
                        style={{ fontSize: 12, border: '1px solid var(--border-strong)', background: 'var(--surface-2)', borderRadius: 6, padding: '3px 7px' }}
                      >
                        <option value="">Never</option>
                        <option value="7">7 days</option>
                        <option value="30">30 days</option>
                        <option value="90">90 days</option>
                      </select>
                    </div>
                    <button className="btn btn-primary btn-sm" style={{ width: '100%' }} disabled={shareBusy} onClick={turnOnShare}>Create link</button>
                  </>
                )}
              </div>
            )}
          </div>
          )}
          {perms.canCreateTask && (
            <button className="btn btn-primary btn-sm" onClick={() => { setAddDefaultStatus(null); setAddOpen(true); }}><Icon name="i-plus" className="icon icon-sm" />{t('kanban.addcard')}</button>
          )}
          {perms.canEditProject && (
            <button className="btn-icon" title="Edit project" onClick={() => setEditOpen(true)}>
              <Icon name="i-edit" className="icon icon-sm" />
            </button>
          )}
          {perms.canEditProject && (
            <button className="btn-icon" title="Save as template" onClick={() => setSaveTemplateOpen(true)}>
              <Icon name="i-copy" className="icon icon-sm" />
            </button>
          )}
          {perms.canArchiveProject && (
            <button className="btn-icon" title={proj.isArchived ? 'Unarchive project' : 'Archive project'} onClick={toggleArchive}>
              <Icon name="i-folder" className="icon icon-sm" />
            </button>
          )}
          {perms.canDeleteProject && (
            <button className="btn-icon" title="Delete project" onClick={removeProject}>
              <Icon name="i-trash" className="icon icon-sm" style={{ color: 'var(--status-critical)' }} />
            </button>
          )}
        </div>
      </div>

      {proj.isArchived && (
        <div className="card card-pad" style={{ marginBottom: 16, fontSize: 12.5, color: 'var(--ink-muted)', textAlign: 'center' }}>
          This project is archived.{perms.canArchiveProject ? ' Unarchive it to resume editing.' : ''}
        </div>
      )}

      <div className="tabbar" style={{ position: 'relative' }}>
        {['overview', 'list', 'board', 'gantt', 'roadmap', 'files', 'team'].map((tb) => (
          <button key={tb} className={tab === tb ? 'active' : ''} onClick={() => { setTab(tb); setMoreOpen(false); }}>{t(`proj.tab.${tb}`)}</button>
        ))}
        <div className="popover-wrap">
          <button
            className={['sprints', 'issues', 'timesheet', 'chat'].includes(tab) ? 'active' : ''}
            onClick={() => setMoreOpen((o) => !o)}
          >
            {t('proj.tab.more')} <span style={{ fontSize: 10 }}>▾</span>
          </button>
          {moreOpen && (
            <div className="popover tabbar-more-menu" style={{ padding: 6, width: 160 }}>
              {['sprints', 'issues', 'timesheet', 'chat'].map((tb) => (
                <button
                  key={tb}
                  className={tab === tb ? 'active' : ''}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px', borderRadius: 6 }}
                  onClick={() => { setTab(tb); setMoreOpen(false); }}
                >
                  {t(`proj.tab.${tb}`)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {tab === 'overview' && (
        <>
          <div className="card build-card" style={{ marginBottom: 16 }}>
            <BuildWidget project={proj} doneCount={doneCount} totalCount={totalCount} actualProgress={proj.progress} crew={crew} />
          </div>
          <div className="two-col-layout" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, alignItems: 'start' }}>
            <div className="col gap-16">
              <div className="card card-pad">
                <h3 style={{ fontSize: 14.5, marginBottom: 12 }}>{t('proj.milestones')}</h3>
                <div className="col gap-14">
                  {milestones.map((m) => (
                    <div key={m.id} className="flex items-center gap-10" style={{ cursor: 'pointer' }} onClick={() => setOpenTaskId(m.id)}>
                      <Icon name={m.status === 'done' ? 'i-check-c' : 'i-clock'} className="icon icon-sm" style={{ color: m.status === 'done' ? 'var(--status-good)' : 'var(--ink-muted)' }} />
                      <div className="grow truncate" style={{ fontSize: 13 }}>{m.title}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{m.due}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card card-pad">
                <h3 style={{ fontSize: 14.5, marginBottom: 12 }}>{t('dash.dist.title')}</h3>
                <div className="flex" style={{ height: 26, borderRadius: 6, overflow: 'hidden', gap: 2 }}>
                  {distribution.map((d) => <div key={d.status} style={{ flex: d.count || 0.001, background: STATUS_COLOR[d.status] }} />)}
                </div>
                <div className="flex wrap gap-16" style={{ marginTop: 14 }}>
                  {distribution.map((d) => (
                    <span key={d.status} className={`pill pill-${d.status}`}><span className="dot" />{t(STATUS_LABEL_KEY[d.status])} · {d.count}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="col gap-16">
              <div className="card card-pad">
                <h3 style={{ fontSize: 14.5, marginBottom: 12 }}>{t('proj.details')}</h3>
                <div className="col gap-12" style={{ fontSize: 12.5 }}>
                  <div className="flex justify-between"><span style={{ color: 'var(--ink-muted)' }}>Owner</span><span>{owner?.name}</span></div>
                  <div className="flex justify-between"><span style={{ color: 'var(--ink-muted)' }}>Client</span><span>{proj.client}</span></div>
                  <div className="flex justify-between"><span style={{ color: 'var(--ink-muted)' }}>Start</span><span>{proj.start}</span></div>
                  <div className="flex justify-between"><span style={{ color: 'var(--ink-muted)' }}>Due</span><span>{proj.due}</span></div>
                  <div className="flex justify-between"><span style={{ color: 'var(--ink-muted)' }}>Budget (USD)</span><EditableMoney value={proj.budget} onSave={(v) => saveProjectField({ budget: v })} readOnly={!perms.canEditProject} /></div>
                  <div className="flex justify-between"><span style={{ color: 'var(--ink-muted)' }}>Spent (USD)</span><EditableMoney value={proj.spent} onSave={(v) => saveProjectField({ spent: v })} readOnly={!perms.canEditProject} /></div>
                </div>
              </div>
              <div className="card card-pad">
                <h3 style={{ fontSize: 14.5, marginBottom: 12 }}>{t('proj.integrations')}</h3>
                <div className="col gap-10" style={{ fontSize: 12.5 }}>
                  {(proj.integrations || []).map((it) => (
                    <div key={it.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-8"><Icon name={it.icon} className="icon icon-sm" />{it.label}</div>
                      <span className={`pill pill-${it.status === 'connected' ? 'done' : 'todo'}`} style={{ padding: '2px 8px', fontSize: 10.5 }}>{it.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'list' && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }} className="card">
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--ink-muted)', fontSize: 11.5 }}>
              <th style={{ padding: '10px 14px' }}>Status</th>
              <th style={{ padding: '10px 14px' }}>Task</th>
              <th style={{ padding: '10px 14px' }}>Owner</th>
              <th style={{ padding: '10px 14px' }}>Priority</th>
              <th style={{ padding: '10px 14px', width: 130 }}>Progress</th>
              <th style={{ padding: '10px 14px' }}>Start</th>
              <th style={{ padding: '10px 14px' }}>Due</th>
              <th style={{ padding: '10px 14px' }}>Subtasks</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 && (
              <tr><td colSpan={8} style={{ padding: '16px 14px', color: 'var(--ink-muted)' }}>No tasks yet.</td></tr>
            )}
            {tasks.map((tk) => {
              const a = person(tk.assignee);
              const subtaskCount = childrenOf(tk.id).length;
              return (
                <tr key={tk.id} className="lgroup-row" style={{ cursor: 'pointer' }} onClick={() => setOpenTaskId(tk.id)}>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}><Pill status={tk.status} /></td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>{tk.title}</td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-8"><Avatar person={a} size={22} />{a?.name}</div>
                  </td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}><span className={`prio-${tk.priority}`} style={{ textTransform: 'capitalize', fontWeight: 700 }}>{tk.priority}</span></td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-8"><div className="meter grow"><span style={{ width: tk.progress + '%' }} /></div><span className="tabular" style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{tk.progress}%</span></div>
                  </td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', color: 'var(--ink-muted)' }}>{tk.start || '—'}</td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', color: 'var(--ink-muted)' }}>{tk.due}</td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', color: 'var(--ink-muted)' }}>{subtaskCount || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {tab === 'board' && (
        <KanbanBoard
          tasks={tasks} onOpenTask={setOpenTaskId} readOnly={!perms.canEditTask}
          onAddTask={(status) => { setAddDefaultStatus(status); setAddOpen(true); }}
        />
      )}

      {tab === 'roadmap' && <RoadmapTrack projectId={proj.id} readOnly={!perms.canEditTask} />}

      {tab === 'files' && (
        <div className="card card-pad">
          {files === null && <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>Loading files…</p>}
          {files && files.length === 0 && <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>No files attached yet — attach one from any task or subtask.</p>}
          <div className="col gap-10">
            {files?.map((f) => (
              <div key={f.id} className="flex items-center gap-10" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <Icon name="i-paperclip" className="icon icon-sm" style={{ color: 'var(--ink-muted)' }} />
                <div className="grow">
                  <a href={downloadUrl(f.id)} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--brand-600)' }}>{f.filename}</a>
                  <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>on “{f.taskTitle}”</div>
                </div>
                <a href={downloadUrl(f.id)} target="_blank" rel="noreferrer" title="Download">
                  <Icon name="i-download" className="icon icon-sm" style={{ color: 'var(--ink-muted)' }} />
                </a>
                {perms.canEditTask && (
                  <button
                    className="btn-icon" title="Delete file"
                    onClick={async () => { await deleteAttachment(f.id); setFiles((fs) => fs.filter((x) => x.id !== f.id)); }}
                  >
                    <Icon name="i-trash" className="icon icon-sm" style={{ color: 'var(--ink-muted)' }} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'gantt' && (
        <div className="card" style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 820, padding: 16 }}>
            {ganttRows.length > 0 ? (
              <GanttChart
                rows={ganttRows} milestones={ganttMilestones}
                onToggleCollapse={toggleGanttCollapse} onRowClick={setOpenTaskId}
              />
            ) : (
              <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>Add start and end dates to tasks to display them on the Gantt chart.</p>
            )}
          </div>
        </div>
      )}

      {tab === 'timesheet' && <ProjectTimesheet projectId={proj.id} readOnly={!perms.canEditTask} />}

      {tab === 'sprints' && <SprintBoard projectId={proj.id} readOnly={!perms.canEditTask} />}

      {tab === 'issues' && <IssueList projectId={proj.id} readOnly={!perms.canEditTask} />}

      {tab === 'chat' && <ChatPanel projectId={proj.id} />}

      {tab === 'team' && (
        <div className="col gap-16">
          {perms.canManageMembers && (
            <div className="card card-pad flex items-center justify-between">
              <div style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>Invite someone who isn't in this workspace yet, or isn't listed below.</div>
              <button className="btn btn-secondary btn-sm" onClick={() => setInviteOpen(true)}>
                <Icon name="i-users" className="icon icon-sm" />Invite someone new
              </button>
            </div>
          )}
          {perms.canManageMembers && availableToAdd.length > 0 && (
            <div className="card card-pad flex items-center gap-10">
              <select className="grow" style={{ border: '1px solid var(--border-strong)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '9px 11px', fontSize: 13, color: 'var(--ink-primary)' }} value={newMemberId} onChange={(e) => setNewMemberId(e.target.value)}>
                <option value="">Add someone to this project…</option>
                {availableToAdd.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.role}</option>)}
              </select>
              <button className="btn btn-primary btn-sm" disabled={!newMemberId} onClick={addMember}>
                <Icon name="i-plus" className="icon icon-sm" />Add to project
              </button>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
            {teamIds.map((pid) => {
              const p = person(pid);
              if (!p) return null;
              const assigned = tasks.filter((tk) => tk.assignee === pid).length;
              const membership = members.find((m) => m.userId === pid);
              const canRemove = perms.canManageMembers && pid !== proj.ownerId && !!membership;
              return (
                <div key={pid} className="card card-pad flex items-center gap-12">
                  <Avatar person={p} size={40} />
                  <div className="grow">
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{p.name}{pid === proj.ownerId ? ' · Owner' : ''}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{p.role}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 2 }}>{assigned} task{assigned === 1 ? '' : 's'} on this project</div>
                    {membership && (
                      <div className="flex items-center gap-6" style={{ marginTop: 4 }}>
                        <span className="pill" style={{ fontSize: 10.5, padding: '2px 8px', textTransform: 'capitalize' }}>
                          {wsRoleByUserId[pid] === 'ADMIN' ? 'Admin' : wsRoleByUserId[pid] === 'VIEWER' ? 'Viewer' : 'Member'}
                        </span>
                      </div>
                    )}
                  </div>
                  {canRemove && (
                    <button className="btn-icon" title="Remove from project" onClick={() => removeMember(pid)}>
                      <Icon name="i-x" className="icon icon-sm" style={{ color: 'var(--ink-muted)' }} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div>
            <h4 style={{ fontSize: 12.5, color: 'var(--ink-muted)', marginBottom: 8 }}>Custom fields</h4>
            <CustomFieldsPanel projectId={proj.id} readOnly={!perms.canEditTask} />
          </div>
        </div>
      )}

      {openTaskId && <TaskPanel taskId={openTaskId} onClose={() => setOpenTaskId(null)} />}
      {addOpen && <QuickAddModal defaultProjectId={proj.id} defaultStatus={addDefaultStatus} onClose={() => setAddOpen(false)} />}
      {saveTemplateOpen && <SaveAsTemplateModal projectId={proj.id} defaultName={proj.name} onClose={() => setSaveTemplateOpen(false)} />}
      {editOpen && <EditProjectModal project={proj} onClose={() => setEditOpen(false)} onSaved={() => bump((n) => n + 1)} />}
      {inviteOpen && <AddTeamMemberModal lockedProject={{ id: proj.id, name: proj.name }} onClose={() => setInviteOpen(false)} />}
    </section>
  );
}
