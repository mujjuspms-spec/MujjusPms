import { Router } from 'express';
import { requireAuth } from '../lib/auth.js';
import { isConfigured, generateInsights, chat } from '../lib/ai.js';
import { logAudit } from '../lib/audit.js';

const router = Router();

router.get('/status', requireAuth, async (req, res) => {
  res.json({ configured: await isConfigured() });
});

router.get('/insights', requireAuth, async (req, res) => {
  if (!(await isConfigured())) {
    return res.status(400).json({ error: 'Configure SERPER_API_KEY in the backend to enable insights.' });
  }
  try {
    const insights = await generateInsights(req.user, req.headers['x-workspace-id']);
    res.json({ insights });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

router.post('/chat', requireAuth, async (req, res) => {
  if (!(await isConfigured())) {
    return res.status(400).json({ error: 'Configure SERPER_API_KEY in the backend to enable AI Copilot.' });
  }
  const { message, history = [] } = req.body;
  if (!message || !message.trim()) return res.status(400).json({ error: 'message is required' });
  try {
    const reply = await chat(history, message.trim(), req.user, req.headers['x-workspace-id']);
    await logAudit(req.user.id, 'ai_chat', 'copilot', 'chat', { message: message.trim().slice(0, 200) });
    res.json({ reply });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

export default router;
