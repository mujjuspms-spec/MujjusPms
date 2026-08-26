import 'dotenv/config';
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import peopleRoutes from './routes/people.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import attachmentRoutes from './routes/attachments.js';
import notificationRoutes from './routes/notifications.js';
import automationRoutes from './routes/automations.js';
import auditRoutes from './routes/audit.js';
import integrationRoutes from './routes/integrations.js';
import commentRoutes from './routes/comments.js';
import aiRoutes from './routes/ai.js';
import roadmapRoutes from './routes/roadmap.js';
import timesheetRoutes from './routes/timesheets.js';
import ssoRoutes from './routes/sso.js';
import goalRoutes from './routes/goals.js';
import apiKeyRoutes from './routes/apiKeys.js';
import webhookRoutes from './routes/webhooks.js';
import publicApiRoutes from './routes/publicApi.js';
import reportRoutes from './routes/reports.js';
import { runDueDateAutomations } from './lib/automations.js';
import cronRoutes from './routes/cron.js';
import eventRoutes from './routes/events.js';
import issueRoutes from './routes/issues.js';
import customFieldRoutes from './routes/customFields.js';
import sprintRoutes from './routes/sprints.js';
import approvalRoutes from './routes/approvals.js';
import chatRoutes from './routes/chat.js';
import timerRoutes from './routes/timer.js';
import shareRoutes from './routes/share.js';
import workspaceRoutes from './routes/workspaces.js';
import workspaceSettingsRoutes from './routes/workspaceSettings.js';
import projectTemplateRoutes from './routes/projectTemplates.js';
import adminRoutes from './routes/admin.js';

// A single bad request should never take the whole server down.
process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));
process.on('uncaughtException', (err) => console.error('Uncaught exception:', err));

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/people', peopleRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/automations', automationRoutes);
app.use('/api/audit-log', auditRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/roadmap', roadmapRoutes);
app.use('/api/timesheets', timesheetRoutes);
app.use('/api/auth/sso', ssoRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/keys', apiKeyRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/v1', publicApiRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/custom-fields', customFieldRoutes);
app.use('/api/sprints', sprintRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/timer', timerRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/workspaces/:id/settings', workspaceSettingsRoutes);
app.use('/api/project-templates', projectTemplateRoutes);
app.use('/api/admin', adminRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => console.log(`MujuzPM backend listening on http://localhost:${PORT}`));

  // In local development, run the due-date automation once at boot, then every 6 hours.
  // In production, this is handled by Vercel Cron calling /api/cron/due-dates.
  runDueDateAutomations().catch((e) => console.error('Due-date automation check failed:', e));
  setInterval(() => { runDueDateAutomations().catch((e) => console.error('Due-date automation check failed:', e)); }, 6 * 60 * 60 * 1000);
}

export default app;
