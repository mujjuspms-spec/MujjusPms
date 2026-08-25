-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "health" TEXT NOT NULL,
    "progress" INTEGER NOT NULL,
    "due" TEXT NOT NULL,
    "start" TEXT NOT NULL,
    "desc" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "budget" REAL NOT NULL,
    "spent" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "integrationsJson" TEXT NOT NULL DEFAULT '[]',
    "ownerId" TEXT NOT NULL,
    "publicShareToken" TEXT,
    "publicShareExpiresAt" DATETIME,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "workspaceId" TEXT NOT NULL,
    CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Project_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("budget", "client", "currency", "desc", "due", "health", "id", "integrationsJson", "isArchived", "name", "ownerId", "progress", "publicShareExpiresAt", "publicShareToken", "spent", "start", "workspaceId") SELECT "budget", "client", "currency", "desc", "due", "health", "id", "integrationsJson", "isArchived", "name", "ownerId", "progress", "publicShareExpiresAt", "publicShareToken", "spent", "start", "workspaceId" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE UNIQUE INDEX "Project_publicShareToken_key" ON "Project"("publicShareToken");
CREATE INDEX "Project_workspaceId_idx" ON "Project"("workspaceId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

