import { Router } from 'express';
import { runDueDateAutomations } from '../lib/automations.js';

const router = Router();

router.get('/due-dates', async (req, res) => {
  // Check the Vercel Cron secret
  const authHeader = req.headers.authorization || '';
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized cron request' });
  }

  try {
    await runDueDateAutomations();
    res.json({ ok: true });
  } catch (err) {
    console.error('Cron job error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
