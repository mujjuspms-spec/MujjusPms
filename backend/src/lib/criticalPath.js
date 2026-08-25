// Simplified critical-path calculation over top-level tasks in a project:
// each task's "duration" is derived from its due date (assume 18 days unless
// a dependency chain pushes it later), and the critical path is the longest
// duration-weighted chain through the dependsOn graph.
export function computeCriticalPath(tasks) {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const memo = new Map();
  // Ids currently on the DFS stack — a dependency that lands back on this
  // stack is a cycle (bad data: a task depending on itself, directly or
  // transitively). Treat it as a dead end instead of recursing forever.
  const visiting = new Set();

  function duration(t) {
    return 18; // placeholder single-unit duration per task, in days
  }

  function longestChain(id) {
    if (memo.has(id)) return memo.get(id);
    const t = byId.get(id);
    if (!t) return { length: 0, path: [] };
    if (visiting.has(id)) return { length: 0, path: [] };
    visiting.add(id);
    const deps = (t.dependsOn || []).filter((d) => d !== id && byId.has(d));
    let result;
    if (deps.length === 0) {
      result = { length: duration(t), path: [id] };
    } else {
      let best = { length: 0, path: [] };
      for (const d of deps) {
        const chain = longestChain(d);
        if (chain.length > best.length) best = chain;
      }
      result = { length: best.length + duration(t), path: [...best.path, id] };
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

// Would setting `taskId`'s dependsOn to `newDeps` create a cycle? True if
// any candidate dependency already (transitively) depends on `taskId`, or
// lists `taskId` itself. `dependsOnById` is a Map<taskId, string[]> of every
// other task's current dependsOn ids — the caller decides what's in scope
// (e.g. the whole workspace), since dependencies aren't restricted to one
// project. Written iteratively (not recursive) so pre-existing bad data
// elsewhere in the graph can't blow the stack while we're validating a fix.
export function wouldCreateCycle(dependsOnById, taskId, newDeps) {
  for (const start of newDeps) {
    if (start === taskId) return true;
    const seen = new Set();
    const stack = [start];
    while (stack.length) {
      const current = stack.pop();
      if (current === taskId) return true;
      if (seen.has(current)) continue;
      seen.add(current);
      for (const next of dependsOnById.get(current) || []) stack.push(next);
    }
  }
  return false;
}
