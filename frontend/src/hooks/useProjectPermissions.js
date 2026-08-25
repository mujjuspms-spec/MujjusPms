import { useWorkspace } from './useWorkspace';
import { project } from '../services/projects';

// Centralized frontend permission layer for one project — mirrors
// backend/src/lib/permissions.js so the UI never re-derives its own rules.
// Admin (workspace ADMIN) sees/edits everything; a project Member can
// create/edit/delete within this project; a Viewer (or a stranger with no
// membership) is strictly read-only.
export function useProjectPermissions(projectId) {
  const { isWorkspaceAdmin: isAdmin } = useWorkspace();
  const proj = project(projectId);
  const role = isAdmin ? 'admin' : proj?.myRole ?? null;
  const isMember = role === 'member';
  const isViewer = role === 'viewer';
  const canEdit = isAdmin || isMember;

  return {
    role, isAdmin, isMember, isViewer,
    hasAccess: isAdmin || role != null,
    canEditProject: isAdmin,
    canDeleteProject: isAdmin,
    canArchiveProject: isAdmin,
    canManageMembers: isAdmin,
    canCreateTask: canEdit,
    canEditTask: canEdit,
    canDeleteTask: canEdit,
    isReadOnly: !canEdit,
  };
}
