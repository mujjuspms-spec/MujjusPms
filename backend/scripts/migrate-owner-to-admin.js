import { prisma } from '../src/lib/prisma.js';

async function main() {
  const before = await prisma.workspaceMember.groupBy({ by: ['role'], _count: { role: true } });
  console.log('Before:', before);

  const totalBefore = await prisma.workspaceMember.count();
  const result = await prisma.workspaceMember.updateMany({ where: { role: 'OWNER' }, data: { role: 'ADMIN' } });
  console.log(`Updated ${result.count} row(s) from OWNER to ADMIN.`);

  const after = await prisma.workspaceMember.groupBy({ by: ['role'], _count: { role: true } });
  console.log('After:', after);
  const totalAfter = await prisma.workspaceMember.count();

  if (totalBefore !== totalAfter) {
    throw new Error(`Row count changed! before=${totalBefore} after=${totalAfter}`);
  }
  if (after.some((r) => r.role === 'OWNER')) {
    throw new Error('OWNER rows still remain after migration.');
  }
  console.log(`OK — total WorkspaceMember rows unchanged (${totalAfter}), no OWNER remaining.`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
