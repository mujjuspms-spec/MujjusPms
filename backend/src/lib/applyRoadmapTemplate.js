import { prisma } from './prisma.js';

// Turns a roadmap template into real tasks: one top-level task per phase
// (the roadmap "nodes"), each with a few starter subtasks nested under it.
export async function applyTemplateToProject(projectId, template, userId) {
  let created = 0;
  for (let i = 0; i < template.phases.length; i++) {
    const phase = template.phases[i];
    const phaseTask = await prisma.task.create({
      data: {
        projectId, parentId: null, title: phase.title, desc: phase.description,
        status: i === 0 ? 'progress' : 'todo', priority: 'medium', assigneeId: userId,
        due: 'Unscheduled', order: i, createdById: userId,
      },
    });
    created++;
    const subtasks = phase.subtasks || [];
    for (let j = 0; j < subtasks.length; j++) {
      await prisma.task.create({
        data: {
          projectId, parentId: phaseTask.id, title: subtasks[j], desc: null,
          status: 'todo', priority: 'medium', assigneeId: userId,
          due: 'Unscheduled', order: j, createdById: userId,
        },
      });
      created++;
    }
  }
  return created;
}
