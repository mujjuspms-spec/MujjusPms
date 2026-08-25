import { prisma } from './prisma.js';

// Read-only lookup for feature checks outside the settings routes
// themselves (task/timer/comment creation). Returns null for a workspace
// that has never opened Workspace Settings — callers should treat null as
// "use the schema default" (i.e. the feature is on).
export function getWorkspaceSettings(workspaceId) {
  return prisma.workspaceSettings.findUnique({ where: { workspaceId } });
}

const NOTIFY_FIELD = {
  taskAssignment: 'notifyTaskAssignment',
  commentsMentions: 'notifyCommentsMentions',
};

export async function notificationEnabled(workspaceId, key) {
  const settings = await getWorkspaceSettings(workspaceId);
  if (!settings) return true;
  const field = NOTIFY_FIELD[key];
  return field ? settings[field] : true;
}
