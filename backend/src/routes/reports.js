import { Router } from 'express';
import * as XLSX from 'xlsx';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../lib/auth.js';
import { accessibleProjectIds, requireWorkspaceContext } from '../lib/permissions.js';

const router = Router();

router.get('/export', requireAuth, requireWorkspaceContext, async (req, res) => {
  const ids = await accessibleProjectIds(req.user, req.workspaceId);
  const projectWhere = ids === null ? { workspaceId: req.workspaceId } : { id: { in: ids } };
  const [projects, tasks] = await Promise.all([
    prisma.project.findMany({ where: projectWhere }),
    prisma.task.findMany({ where: { parentId: null, project: projectWhere } }),
  ]);

  const projectRows = projects.map((p) => {
    const projectTasks = tasks.filter((t) => t.projectId === p.id);
    const openTasks = projectTasks.filter((t) => t.status !== 'done').length;
    return {
      Project: p.name, Client: p.client, Health: p.health, 'Progress %': p.progress,
      'Open tasks': openTasks, 'Total tasks': projectTasks.length,
      'Budget (USD)': p.budget, 'Spent (USD)': p.spent, 'Remaining (USD)': p.budget - p.spent,
      Due: p.due,
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(projectRows);
  ws['!cols'] = [{ wch: 22 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Portfolio');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="mujuzpm-portfolio-report.xlsx"');
  res.send(buf);
});

export default router;
