import { apiFetch } from './api';

export function fetchAiStatus() {
  return apiFetch('/api/ai/status').then((r) => r.configured);
}

export function fetchInsights() {
  return apiFetch('/api/ai/insights').then((r) => r.insights);
}

export function askCopilot(message, history = []) {
  return apiFetch('/api/ai/chat', { method: 'POST', body: JSON.stringify({ message, history }) }).then((r) => r.reply);
}
