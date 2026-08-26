import { prisma } from './prisma.js';

const WORKSPACE_RANK = { VIEWER: 0, MEMBER: 1, ADMIN: 2 };

export async function getWorkspaceRole(userId, workspaceId) {
  if (!userId || !workspaceId) return null;
  const m = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!m || m.status !== 'ACTIVE') return null;
  return m.role;
}

export async function isAdmin(user, workspaceId) {
  return (await getWorkspaceRole(user?.id, workspaceId)) === 'ADMIN';
}
export async function isMember(user, workspaceId) {
  return (await getWorkspaceRole(user?.id, workspaceId)) === 'MEMBER';
}
export async function isViewer(user, workspaceId) {
  return (await getWorkspaceRole(user?.id, workspaceId)) === 'VIEWER';
}

export async function workspaceIdForProject(projectId) {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { workspaceId: true } });
  return project?.workspaceId || null;
}

// Existence of a ProjectMember row is the sole meaning of "assigned to this
// project" — the row's own `.role` column is vestigial and never read.
// Write-vs-read-only comes entirely from the user's workspace role.
async function hasProjectMembership(userId, projectId) {
  const m = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return !!m;
}

export async function canAccessProject(user, projectId) {
  const workspaceId = await workspaceIdForProject(projectId);
  if (await isAdmin(user, workspaceId)) return true;
  return hasProjectMembership(user.id, projectId);
}

// Returns the caller's effective role for this project: 'admin' if a
// workspace Admin (workspace-wide access, no membership row needed),
// 'member'/'viewer' if assigned (mirrors their workspace role), else null.
export async function getProjectRole(user, projectId) {
  const workspaceId = await workspaceIdForProject(projectId);
  const role = await getWorkspaceRole(user?.id, workspaceId);
  if (role === 'ADMIN') return 'admin';
  if (!role) return null;
  if (!(await hasProjectMembership(user.id, projectId))) return null;
  return role === 'MEMBER' ? 'member' : 'viewer';
}

export async function isProjectViewer(user, projectId) {
  return (await getProjectRole(user, projectId)) === 'viewer';
}

export async function canEditProject(user, projectId) {
  return isAdmin(user, await workspaceIdForProject(projectId));
}
export const canManageMembers = canEditProject;

export async function canModifyProject(user, projectId) {
  const workspaceId = await workspaceIdForProject(projectId);
  const role = await getWorkspaceRole(user?.id, workspaceId);
  if (role === 'ADMIN') return true;
  if (role !== 'MEMBER') return false;
  return hasProjectMembership(user.id, projectId);
}
export const canEditTask = canModifyProject;
export const canDeleteTask = canModifyProject;

// Task creation and Viewer-commenting both have a real, Admin-configurable
// workspace toggle (Workspace Settings → Tasks & Workflow) — unlike other
// permission checks, these two look up WorkspaceSettings so the toggle
// actually does something, rather than being a decorative control.
//
// Returns { allowed, reason } rather than a plain boolean — there are
// several distinct ways this can be denied (not a workspace member at all,
// a Viewer, a Member not assigned to this project, or the workspace toggle
// being off) and callers should surface the real reason instead of a single
// generic message that's wrong most of the time it's shown.
export async function canCreateTask(user, projectId) {
  const workspaceId = await workspaceIdForProject(projectId);
  const role = await getWorkspaceRole(user?.id, workspaceId);
  if (role === 'ADMIN') return { allowed: true };
  if (!role) return { allowed: false, reason: 'You do not have access to this workspace' };
  if (role === 'VIEWER') return { allowed: false, reason: 'Viewers cannot create tasks' };
  if (!(await hasProjectMembership(user.id, projectId))) return { allowed: false, reason: 'You do not have access to this project' };
  const settings = await prisma.workspaceSettings.findUnique({ where: { workspaceId } });
  if (settings && !settings.allowMemberTaskCreation) return { allowed: false, reason: 'Task creation is disabled for members in this workspace' };
  return { allowed: true };
}

export async function canCommentOnTask(user, projectId) {
  const workspaceId = await workspaceIdForProject(projectId);
  const role = await getWorkspaceRole(user?.id, workspaceId);
  if (role === 'ADMIN') return true;
  if (!role || !(await hasProjectMembership(user.id, projectId))) return false;
  if (role === 'MEMBER') return true;
  const settings = await prisma.workspaceSettings.findUnique({ where: { workspaceId } });
  return settings ? settings.allowViewerComments : false;
}

export async function canCreateProject(user, workspaceId) {
  return isAdmin(user, workspaceId);
}
export const canManageWorkspaceMembers = canCreateProject;

// Timesheets: viewing is part of general project access; only Admin or an
// assigned Member (never Viewer) may create/edit their OWN entries. Nobody
// may edit another person's entry — no approval-override feature exists yet.
export async function canViewTimesheets(user, projectId) {
  return canAccessProject(user, projectId);
}
export async function canCreateOwnTimesheet(user, projectId) {
  return canModifyProject(user, projectId);
}
export const canEditOwnTimesheet = canCreateOwnTimesheet;
export function canEditOthersTimesheets() {
  return false;
}

export async function accessibleProjectIds(user, workspaceId) {
  if (await isAdmin(user, workspaceId)) return null;
  const rows = await prisma.projectMember.findMany({
    where: { userId: user.id, project: { workspaceId } },
    select: { projectId: true },
  });
  return rows.map((r) => r.projectId);
}

export async function projectIdForTask(taskId) {
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true } });
  return task?.projectId || null;
}
export async function workspaceIdForTask(taskId) {
  const projectId = await projectIdForTask(taskId);
  return projectId ? workspaceIdForProject(projectId) : null;
}

export async function requireWorkspaceContext(req, res, next) {
  const workspaceId = req.headers['x-workspace-id'];
  if (!workspaceId) return res.status(400).json({ error: 'Missing workspace context' });
  const m = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: req.user.id } },
  });
  if (!m || m.status !== 'ACTIVE') return res.status(403).json({ error: 'Not a member of this workspace' });
  req.workspaceId = workspaceId;
  req.workspaceRole = m.role;
  next();
}

export function requireWorkspaceRole(minRole) {
  return (req, res, next) => {
    const rank = WORKSPACE_RANK[req.workspaceRole] ?? -1;
    if (rank < WORKSPACE_RANK[minRole]) return res.status(403).json({ error: `Requires ${minRole} role or higher in this workspace` });
    next();
  };
}

// A workspace must always keep at least one Admin. Call this BEFORE
// demoting or removing someone who currently holds the Admin role.
export async function isLastAdmin(workspaceId, userId) {
  const otherAdmins = await prisma.workspaceMember.count({
    where: { workspaceId, role: 'ADMIN', status: 'ACTIVE', userId: { not: userId } },
  });
  return otherAdmins === 0;
}

export async function requireAdmin(req, res, next) {
  if (!(await isAdmin(req.user, req.workspaceId))) return res.status(403).json({ error: 'Admin access required' });
  next();
}

export function requireGlobalAdmin(req, res, next) {
  if (req.user.globalRole !== 'admin') return res.status(403).json({ error: 'Global admin access required' });
  next();
}

export function requireProjectAccess(getProjectId = (req) => req.params.projectId || req.params.id) {
  return async (req, res, next) => {
    const projectId = getProjectId(req);
    if (!(await canAccessProject(req.user, projectId))) {
      return res.status(403).json({ error: 'You do not have access to this project' });
    }
    next();
  };
}

export function requireProjectEditor(getProjectId = (req) => req.params.projectId || req.params.id) {
  return async (req, res, next) => {
    const projectId = getProjectId(req);
    if (!(await canModifyProject(req.user, projectId))) {
      return res.status(403).json({ error: 'Viewers cannot modify this project' });
    }
    next();
  };
}
