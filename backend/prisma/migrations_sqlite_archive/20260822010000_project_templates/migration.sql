-- AlterTable
ALTER TABLE "Project" ADD COLUMN "sourceTemplateId" TEXT;
ALTER TABLE "Project" ADD COLUMN "sourceTemplateVersion" INTEGER;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CustomTemplate";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "ProjectTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL,
    "industry" TEXT NOT NULL DEFAULT 'General',
    "icon" TEXT NOT NULL DEFAULT 'i-folder',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "tagsJson" TEXT NOT NULL DEFAULT '[]',
    "defaultView" TEXT,
    "isSystemTemplate" BOOLEAN NOT NULL DEFAULT false,
    "workspaceId" TEXT,
    "createdById" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectTemplate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProjectTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectTemplatePhase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProjectTemplatePhase_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProjectTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectTemplateTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "phaseId" TEXT,
    "parentTaskId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "defaultStatus" TEXT NOT NULL DEFAULT 'todo',
    "defaultPriority" TEXT NOT NULL DEFAULT 'medium',
    "estimatedDays" INTEGER,
    "dependsOnJson" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "ProjectTemplateTask_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProjectTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectTemplateTask_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "ProjectTemplatePhase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectTemplateTask_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "ProjectTemplateTask" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectTemplateMilestone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relativeDay" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProjectTemplateMilestone_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProjectTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectTemplateCustomField" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "optionsJson" TEXT NOT NULL DEFAULT '[]',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProjectTemplateCustomField_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProjectTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectTemplate_slug_key" ON "ProjectTemplate"("slug");

-- CreateIndex
CREATE INDEX "ProjectTemplate_workspaceId_idx" ON "ProjectTemplate"("workspaceId");

-- CreateIndex
CREATE INDEX "ProjectTemplate_category_idx" ON "ProjectTemplate"("category");

