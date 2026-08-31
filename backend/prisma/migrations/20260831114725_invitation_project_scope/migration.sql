-- AlterTable
ALTER TABLE "WorkspaceInvitation" ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "inviteeUserId" TEXT;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "invitationId" TEXT;

-- CreateIndex
CREATE INDEX "WorkspaceInvitation_projectId_idx" ON "WorkspaceInvitation"("projectId");

-- AddForeignKey
ALTER TABLE "WorkspaceInvitation" ADD CONSTRAINT "WorkspaceInvitation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceInvitation" ADD CONSTRAINT "WorkspaceInvitation_inviteeUserId_fkey" FOREIGN KEY ("inviteeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "WorkspaceInvitation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
