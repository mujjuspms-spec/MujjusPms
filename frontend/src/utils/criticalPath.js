// Mirrors backend/src/lib/criticalPath.js so the Gantt can highlight the
// critical path without an extra round trip — tasks are already loaded.
export function computeCriticalPath(tasks) {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const memo = new Map();
  // Ids currently on the DFS stack — a dependency that lands back on this
  // stack is a cycle (bad data: a task depending on itself, directly or
  // transitively). Treat it as a dead end instead of recursing forever.
  const visiting = new Set();
  const duration = () => 18;

  function longestChain(id) {
    if (memo.has(id)) return memo.get(id);
    const t = byId.get(id);
    if (!t) return { length: 0, path: [] };
    if (visiting.has(id)) return { length: 0, path: [] };
    visiting.add(id);
    const deps = (t.dependsOn || []).filter((d) => d !== id && byId.has(d));
    let result;
    if (deps.length === 0) {
      result = { length: duration(), path: [id] };
    } else {
      let best = { length: 0, path: [] };
      for (const d of deps) {
        const chain = longestChain(d);
        if (chain.length > best.length) best = chain;
      }
      result = { length: best.length + duration(), path: [...best.path, id] };
    }
    visiting.delete(id);
    memo.set(id, result);
    return result;
  }

  let overallBest = { length: 0, path: [] };
  for (const t of tasks) {
    const chain = longestChain(t.id);
    if (chain.length > overallBest.length) overallBest = chain;
  }
  return new Set(overallBest.path);
}
