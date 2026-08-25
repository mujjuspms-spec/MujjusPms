import { Router } from 'express';
import { requireAuth } from '../lib/auth.js';
import { addClient, removeClient } from '../lib/sse.js';

const router = Router();

router.get('/stream', requireAuth, (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('data: {"type":"connected"}\n\n');
  addClient(res);

  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25000);
  req.on('close', () => {
    clearInterval(heartbeat);
    removeClient(res);
  });
});

export default router;
