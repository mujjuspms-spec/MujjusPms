// One-time data fix: creates a single "KaRama Ventures" Workspace, attaches
// every existing Project to it, and creates a WorkspaceMember row for every
// User that exists in the database *at the time this script is run*, using
// their current globalRole as the mapping rule (owner->OWNER, admin->ADMIN,
// everyone else->MEMBER). This preserves exactly the access every existing
// account already has today. Run once: `node prisma/backfill-workspace.js`.
// Never wire this into `npm run dev`/start — running it twice would error
// on the unique (workspaceId, userId) constraint, which is the intended
// guard against accidentally re-running it.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adapter = new PrismaBetterSqlite3({ url: `file:${path.join(__dirname, '..', 'dev.db')}` });
const prisma = new PrismaClient({ adapter });

function mapRole(globalRole) {
  if (globalRole === 'owner') return 'OWNER';
  if (globalRole === 'admin') return 'ADMIN';
  return 'MEMBER';
}

async function main() {
  const existing = await prisma.workspace.findUnique({ where: { slug: 'karama-ventures' } });
  if (existing) {
    console.log('Workspace "karama-ventures" already exists — backfill already ran, aborting.');
    return;
  }

  const users = await prisma.user.findMany();
  const owner = users.find((u) => u.globalRole === 'owner') || users[0];
  if (!owner) throw new Error('No users found — nothing to migrate.');

  const result = await prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: {
        name: 'KaRama Ventures',
        slug: 'karama-ventures',
        timezone: 'Asia/Riyadh',
        createdBy: owner.id,
        onboardingStep: null, // pre-existing data — already "done", never show the wizard
      },
    });

    const { count: projectsUpdated } = await tx.project.updateMany({
      where: { workspaceId: null },
      data: { workspaceId: workspace.id },
    });

    for (const u of users) {
      await tx.workspaceMember.create({
        data: { workspaceId: workspace.id, userId: u.id, role: mapRole(u.globalRole), status: 'ACTIVE' },
      });
    }

    return { workspace, projectsUpdated, membersCreated: users.length };
  });

  console.log(`Created workspace "${result.workspace.name}" (${result.workspace.id}).`);
  console.log(`Attached ${result.projectsUpdated} existing project(s) to it.`);
  console.log(`Created ${result.membersCreated} workspace membership(s):`);
  for (const u of users) console.log(`  - ${u.name} <${u.email}> globalRole=${u.globalRole} -> ${mapRole(u.globalRole)}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
