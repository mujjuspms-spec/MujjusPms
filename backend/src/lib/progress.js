import { prisma } from './prisma.js';

// Keeps Project.progress in sync with its own top-level tasks — the same
// set ProjectDetail's "X/Y tasks done" label and Board/List/Gantt already
// treat as the project's real task list (subtasks are nested under them,
// not counted separately). Call this after anything that creates,
// deletes, or changes the status of a task.
export async function recalcProjectProgress(projectId) {
  const topLevel = await prisma.task.findMany({ where: { projectId, parentId: null }, select: { status: true } });
  const doneCount = topLevel.filter((t) => t.status === 'done').length;
  const progress = topLevel.length ? Math.round((doneCount / topLevel.length) * 100) : 0;
  await prisma.project.update({ where: { id: projectId }, data: { progress } });
  return progress;
}
