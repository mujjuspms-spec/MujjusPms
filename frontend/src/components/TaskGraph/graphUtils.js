export const ROOT_ID = '__project_root__';

// Shared card geometry — single source of truth for both the layout math
// below and the node sizing/handle geometry in TaskGraph.jsx, so the two
// can never drift out of sync with each other.
export const CARD_W = 280;
export const CARD_H = 136;
export const ROOT_W = 240;
export const ROOT_H = 46;

const COLS = 4;
const GAP_X = 44;
const GAP_Y = 64;
const LEVEL_GAP = 110;

// Flattens the project's real task tree (via parentId / childrenOf) into a
// single array, plus one synthetic root node representing the project
// itself so every top-level task hangs off one connected tree.
export function buildFlatTree(projectName, topLevelTasks, childrenOf) {
  const list = [{ id: ROOT_ID, parentId: null, task: { name: projectName }, isRoot: true, childIds: topLevelTasks.map((t) => t.id) }];

  function walk(task, parentId) {
    const kids = childrenOf(task.id);
    list.push({ id: task.id, parentId, task, isRoot: false, childIds: kids.map((k) => k.id) });
    kids.forEach((k) => walk(k, task.id));
  }
  topLevelTasks.forEach((t) => walk(t, ROOT_ID));
  return list;
}

export function toMap(flat) {
  return new Map(flat.map((n) => [n.id, n]));
}

// Which node ids should actually be rendered, given a set of collapsed ids
// (a collapsed node stays visible itself; its whole subtree is hidden).
export function computeVisible(flat, collapsed) {
  const byId = toMap(flat);
  const visible = new Set();
  function walk(id) {
    visible.add(id);
    if (collapsed.has(id)) return;
    byId.get(id).childIds.forEach(walk);
  }
  walk(ROOT_ID);
  return visible;
}

// Banded grid layout: the project root sits on its own row up top, then
// every depth level gets its own horizontal band directly below the
// previous one — top-level tasks first (wrapping at 4 per row), then all
// their subtasks in the next band (also wrapping at 4 per row, grouped by
// parent so a task's own subtasks stay together), then any nested
// subtasks in the band after that, and so on. Depths are never mixed
// together in the same row, so the diagram always reads top-to-bottom as
// project → tasks → subtasks → nested subtasks.
export function computeLayout(flat, visibleIds) {
  const byId = toMap(flat);
  const positions = {};

  // Group visible ids into one array per depth, breadth-first, so that
  // within a depth level a parent's children stay contiguous.
  const levels = [];
  let current = byId.get(ROOT_ID).childIds.filter((id) => visibleIds.has(id));
  while (current.length > 0) {
    levels.push(current);
    const next = [];
    current.forEach((id) => {
      byId.get(id).childIds.forEach((cid) => { if (visibleIds.has(cid)) next.push(cid); });
    });
    current = next;
  }

  const levelWidths = levels.map((ids) => {
    const cols = Math.min(ids.length, COLS);
    return cols * CARD_W + (cols - 1) * GAP_X;
  });
  const globalWidth = Math.max(ROOT_W, ...levelWidths, 0);

  positions[ROOT_ID] = { x: (globalWidth - ROOT_W) / 2, y: 0 };

  let yCursor = ROOT_H + LEVEL_GAP;
  levels.forEach((ids, levelIndex) => {
    const levelWidth = levelWidths[levelIndex];
    const levelLeft = (globalWidth - levelWidth) / 2;
    const rowCount = Math.ceil(ids.length / COLS);
    for (let r = 0; r < rowCount; r += 1) {
      const rowIds = ids.slice(r * COLS, r * COLS + COLS);
      const rowWidth = rowIds.length * CARD_W + (rowIds.length - 1) * GAP_X;
      const rowLeft = levelLeft + (levelWidth - rowWidth) / 2;
      const y = yCursor + r * (CARD_H + GAP_Y);
      rowIds.forEach((id, i) => {
        positions[id] = { x: rowLeft + i * (CARD_W + GAP_X), y };
      });
    }
    const levelHeight = rowCount * CARD_H + (rowCount - 1) * GAP_Y;
    yCursor += levelHeight + LEVEL_GAP;
  });

  return positions;
}

export function ancestorsOf(id, byId) {
  const out = [];
  let cur = byId.get(id);
  while (cur && cur.parentId) { out.push(cur.parentId); cur = byId.get(cur.parentId); }
  return out;
}

export function descendantsOf(id, byId) {
  const out = [];
  function walk(nid) { byId.get(nid).childIds.forEach((cid) => { out.push(cid); walk(cid); }); }
  walk(id);
  return out;
}

// 0 for a top-level task (direct child of the project root), 1 for its
// subtasks, 2 for a nested subtask's subtasks, and so on.
export function depthOf(id, byId) {
  return ancestorsOf(id, byId).length - 1;
}
