import { prisma } from './prisma.js';

const TODAY = new Date('2026-08-14');

export async function isConfigured() {
  return !!process.env.SERPER_API_KEY;
}

// Builds a compact, factual snapshot of the live portfolio
async function buildPortfolioContext(user, workspaceId) {
  if (!user || !user.id) throw new Error('Unauthorized');
  
  const whereProject = { isArchived: false };
  if (workspaceId) {
    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user.id } }
    });
    if (member && member.status === 'ACTIVE') {
      whereProject.workspaceId = workspaceId;
    } else {
      whereProject.workspaceId = 'NONE';
    }
  } else {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: user.id, status: 'ACTIVE' }
    });
    whereProject.workspaceId = { in: memberships.map(m => m.workspaceId) };
  }

  const [projects, tasks, users] = await Promise.all([
    prisma.project.findMany({ where: whereProject }),
    prisma.task.findMany({ where: { parentId: null, project: whereProject } }),
    prisma.user.findMany(),
  ]);
  const userName = (id) => users.find((u) => u.id === id)?.name || 'Unassigned';

  const lines = ['# MujuzPM portfolio snapshot — today is 14 Aug 2026', ''];
  let totalOverdue = 0;
  let totalBlocked = 0;
  let totalBudget = 0;
  let totalSpent = 0;

  for (const p of projects) {
    const ptasks = tasks.filter((t) => t.projectId === p.id);
    const overdue = ptasks.filter((t) => t.status !== 'done' && !Number.isNaN(Date.parse(t.due)) && new Date(t.due) < TODAY);
    const blocked = ptasks.filter((t) => t.status === 'blocked');
    totalOverdue += overdue.length;
    totalBlocked += blocked.length;
    
    const safeBudget = p.budget || 0;
    const safeSpent = p.spent || 0;
    
    totalBudget += safeBudget;
    totalSpent += safeSpent;

    const spentPct = safeBudget > 0 ? Math.round((safeSpent / safeBudget) * 100) : 0;
    lines.push(
      `## ${p.name} — owner ${userName(p.ownerId)}`,
      `Health: ${p.health}. Progress: ${p.progress}%. Due: ${p.due}. Budget: $${safeBudget.toLocaleString()} (${spentPct}% spent, $${safeSpent.toLocaleString()} so far).`,
      `${ptasks.length} top-level tasks, ${overdue.length} overdue, ${blocked.length} blocked.`,
    );
    for (const t of blocked) lines.push(`- BLOCKED: "${t.title}" (${userName(t.assigneeId)}, due ${t.due})`);
    for (const t of overdue) lines.push(`- OVERDUE: "${t.title}" (${userName(t.assigneeId)}, was due ${t.due})`);
    lines.push('');
  }
  lines.push('# Team workload (hours allocated / weekly capacity)');
  for (const u of users) lines.push(`- ${u.name} (${u.role}): ${u.allocated}/${u.capacity}h`);
  return { text: lines.join('\n'), stats: { totalOverdue, totalBlocked, totalBudget, totalSpent } };
}

export async function generateInsights(user, workspaceId) {
  if (!process.env.SERPER_API_KEY) return null;
  try {
    const context = await buildPortfolioContext(user, workspaceId);
    const s = context.stats;
    
    const insights = [
      `Portfolio budget utilization: $${s.totalSpent.toLocaleString()} spent out of $${s.totalBudget.toLocaleString()} total budget.`,
      `Attention required: There are currently ${s.totalOverdue} overdue tasks across all active projects.`,
      `Bottleneck alert: ${s.totalBlocked} tasks are marked as blocked and need unblocking.`
    ];
    return insights;
  } catch (e) {
    console.error('generateInsights error:', e.message);
    return [
      'Portfolio data is currently unavailable.',
      'Check database connection for real-time insights.',
      'AI Copilot search is still active.'
    ];
  }
}

async function performSerperSearch(query) {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) throw new Error('Serper API key not configured.');
  
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ q: query })
  });

  if (!res.ok) {
    if (res.status === 403) throw new Error('The search service quota has been reached or the API key is invalid. Please try again later.');
    throw new Error('Web search service is currently unavailable.');
  }

  const data = await res.json();
  if (!data || (!data.organic && !data.answerBox && !data.knowledgeGraph)) {
    return 'Search results did not provide enough reliable information to answer this confidently.';
  }

  const lines = ['Based on current web search results:\n'];
  let answered = false;

  if (data.answerBox) {
    const answerText = data.answerBox.snippet || data.answerBox.answer;
    if (answerText) {
      lines.push(`**${data.answerBox.title || 'Answer'}**: ${answerText}\n`);
      answered = true;
    }
  }
  
  if (data.knowledgeGraph && data.knowledgeGraph.description) {
    lines.push(`**${data.knowledgeGraph.title || 'Knowledge'}**: ${data.knowledgeGraph.description}\n`);
    answered = true;
  }

  if (data.organic && Array.isArray(data.organic) && data.organic.length > 0) {
    if (!answered) {
      lines.push(`Here is a summary of the top results:\n`);
      for (const result of data.organic.slice(0, 3)) {
        if (result.snippet || result.title) {
           lines.push(`- **${result.title || 'Result'}**: ${result.snippet || ''}`);
        }
      }
      lines.push('');
    }
    
    lines.push('\n**Sources**:');
    for (const [index, result] of data.organic.slice(0, 3).entries()) {
      if (result.link) {
        let domain = 'web';
        try { domain = new URL(result.link).hostname.replace('www.', ''); } catch(e) {}
        lines.push(`${index + 1}. [${result.title || 'Link'}](${result.link}) — ${domain}`);
      }
    }
  }

  if (lines.length === 1) {
     return 'Search results were found but could not be formatted properly.';
  }

  return lines.join('\n');
}

export async function chat(history, userMessage, user, workspaceId) {
  if (!process.env.SERPER_API_KEY) throw new Error('The web search service is not configured.');
  
  const lowerMsg = userMessage.toLowerCase();
  
  // Rule-based routing
  const isLocalIntent = /(project|task|workflow|budget|overdue|blocked|assign|member|who|my|our|portfolio|status)/i.test(lowerMsg);
  const isSearchIntent = /(search|find|latest|trend|google|who is|what is|how to)/i.test(lowerMsg);

  if (isLocalIntent && !isSearchIntent) {
    try {
      const context = await buildPortfolioContext(user, workspaceId);
      return `Here is the current snapshot of your portfolio data based on your request:\n\n${context.text}\n\n*(Note: Copilot is currently running in local-data mode without an LLM. This is a raw snapshot of your data).*`;
    } catch (e) {
      console.error('Local query error:', e.message);
      return 'I cannot access your project data right now. Please check your database connection.';
    }
  }
  
  // Default to web search
  return await performSerperSearch(userMessage);
}
