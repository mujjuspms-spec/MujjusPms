import { config } from 'dotenv';
config();

import { chat, generateInsights } from './src/lib/ai.js';
import { prisma } from './src/lib/prisma.js';

async function run() {
  try {
    const user = await prisma.user.findFirst();
    console.log('Testing with user:', user?.email);

    console.log('Testing generateInsights...');
    const insights = await generateInsights(user, null);
    console.log(insights);

    console.log('\nTesting local project question...');
    try {
      const reply1 = await chat([], 'what tasks are blocked?', user, null);
      console.log('REPLY1:', reply1);
    } catch(e) {
      console.log('REPLY1 ERROR:', e);
    }

    console.log('\nTesting web search question...');
    try {
      const reply2 = await chat([], 'What are the latest project management trends in 2026?');
      console.log('REPLY:', reply2);
    } catch (e) {
      console.error('CHAT ERROR:', e);
    }
  } catch (e) {
    console.error(e);
  }
}
run();
