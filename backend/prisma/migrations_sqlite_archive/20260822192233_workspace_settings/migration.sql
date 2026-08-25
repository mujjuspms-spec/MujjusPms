-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN "workspaceId" TEXT;

-- CreateTable
CREATE TABLE "WorkspaceSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "workingDaysJson" TEXT NOT NULL DEFAULT '["Mon","Tue","Wed","Thu","Fri"]',
    "workStart" TEXT NOT NULL DEFAULT '09:00',
    "workEnd" TEXT NOT NULL DEFAULT '17:00',
    "weeklyCapacity" INTEGER NOT NULL DEFAULT 40,
    "holidayCalendar" TEXT NOT NULL DEFAULT '',
    "defaultProjectView" TEXT NOT NULL DEFAULT 'overview',
    "allowMembersCreateProjects" BOOLEAN NOT NULL DEFAULT false,
    "projectIdPrefix" TEXT NOT NULL DEFAULT '',
    "allowMemberTaskCreation" BOOLEAN NOT NULL DEFAULT true,
    "allowViewerComments" BOOLEAN NOT NULL DEFAULT false,
    "taskIdPrefix" TEXT NOT NULL DEFAULT '',
    "defaultAssigneeBehavior" TEXT NOT NULL DEFAULT 'unassigned',
    "completedTaskBehavior" TEXT NOT NULL DEFAULT 'keep',
    "timeTrackingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "requireTaskSelection" BOOLEAN NOT NULL DEFAULT false,
    "requireProjectSelection" BOOLEAN NOT NULL DEFAULT true,
    "allowManualEntry" BOOLEAN NOT NULL DEFAULT true,
    "allowTimer" BOOLEAN NOT NULL DEFAULT true,
    "requireNotes" BOOLEAN NOT NULL DEFAULT false,
    "allowFutureEntries" BOOLEAN NOT NULL DEFAULT false,
    "allowBackdatedEntries" BOOLEAN NOT NULL DEFAULT true,
    "timesheetWeekStart" TEXT NOT NULL DEFAULT 'Monday',
    "submissionFrequency" TEXT NOT NULL DEFAULT 'weekly',
    "notifyTaskAssignment" BOOLEAN NOT NULL DEFAULT true,
    "notifyTaskDueSoon" BOOLEAN NOT NULL DEFAULT true,
    "notifyTaskOverdue" BOOLEAN NOT NULL DEFAULT true,
    "notifyProjectStatus" BOOLEAN NOT NULL DEFAULT true,
    "notifyProjectDeadline" BOOLEAN NOT NULL DEFAULT true,
    "notifyCommentsMentions" BOOLEAN NOT NULL DEFAULT true,
    "notifyInvitationUpdates" BOOLEAN NOT NULL DEFAULT true,
    "notifyTimesheetSubmit" BOOLEAN NOT NULL DEFAULT true,
    "notifyTimesheetApproval" BOOLEAN NOT NULL DEFAULT true,
    "allowedEmailDomainsJson" TEXT NOT NULL DEFAULT '[]',
    "allowExternalSharing" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "WorkspaceSettings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Workspace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "logoUrl" TEXT,
    "createdBy" TEXT NOT NULL,
    "onboardingStep" TEXT DEFAULT 'invite',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "industry" TEXT NOT NULL DEFAULT '',
    "teamSize" TEXT NOT NULL DEFAULT '',
    "defaultLanguage" TEXT NOT NULL DEFAULT 'en',
    "dateFormat" TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
    "timeFormat" TEXT NOT NULL DEFAULT '24h',
    "startOfWeek" TEXT NOT NULL DEFAULT 'Monday',
    "isArchived" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_Workspace" ("createdAt", "createdBy", "id", "logoUrl", "name", "onboardingStep", "slug", "timezone", "updatedAt") SELECT "createdAt", "createdBy", "id", "logoUrl", "name", "onboardingStep", "slug", "timezone", "updatedAt" FROM "Workspace";
DROP TABLE "Workspace";
ALTER TABLE "new_Workspace" RENAME TO "Workspace";
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceSettings_workspaceId_key" ON "WorkspaceSettings"("workspaceId");

-- CreateIndex
CREATE INDEX "AuditLog_workspaceId_idx" ON "AuditLog"("workspaceId");

