import { prisma } from './prisma.js';

// workspaceId is optional and defaults to null for actions with no
// workspace context (register/login, personal API keys, SSO). Every
// workspace-scoped action should pass it — that's what makes the Workspace
// Settings → Audit Log page safe to filter by workspace.
export async function logAudit(actorId, action, entityType, entityId, detail = {}, workspaceId = null) {
  await prisma.auditLog.create({
    data: { actorId, action, entityType, entityId, detailJson: JSON.stringify(detail), workspaceId },
  });
}
