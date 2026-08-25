-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "globalRole" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "initials" TEXT NOT NULL,
    "avatarStoredName" TEXT,
    "passwordHash" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 40,
    "allocated" INTEGER NOT NULL DEFAULT 0,
    "phone" TEXT NOT NULL DEFAULT '',
    "department" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "timezone" TEXT NOT NULL DEFAULT '',
    "about" TEXT NOT NULL DEFAULT '',
    "workDays" TEXT NOT NULL DEFAULT '["Mon","Tue","Wed","Thu","Fri"]',
    "workStart" TEXT NOT NULL DEFAULT '09:00',
    "workEnd" TEXT NOT NULL DEFAULT '17:00',
    "passwordChangedAt" DATETIME
);
INSERT INTO "new_User" ("allocated", "avatarStoredName", "capacity", "color", "email", "globalRole", "id", "initials", "name", "passwordHash", "role") SELECT "allocated", "avatarStoredName", "capacity", "color", "email", "globalRole", "id", "initials", "name", "passwordHash", "role" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

