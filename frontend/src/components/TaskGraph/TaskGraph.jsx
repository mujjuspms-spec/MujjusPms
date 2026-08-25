import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReactFlow, ReactFlowProvider, Background, BackgroundVariant, Controls, Panel, MarkerType, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import TaskGraphNode from './TaskGraphNode';
import TaskDetailsPanel from './TaskDetailsPanel';
import { ROOT_ID, CARD_W, CARD_H, ROOT_W, ROOT_H, buildFlatTree, toMap, computeLayout, computeVisible, ancestorsOf, descendantsOf, depthOf } from './graphUtils';
import { fetchProjectMembers } from '../../services/projects';
import { person } from '../../services/people';

const nodeTypes = { taskNode: TaskGraphNode };
const EDGE_COLOR_IDLE = 'var(--border-strong)';
const EDGE_COLOR_ACTIVE = 'var(--accent-cyan)';
const EDGE_COLOR_DIM = 'var(--border)';
const MIN_ZOOM = 0.15;
const MAX_ZOOM = 1.8;
// A fixed, comfortably-readable zoom — the diagram never auto-shrinks to
// cram everything into the window (that made text unreadably small on
// bigger trees, and left almost no room for the "－" control to zoom out
// any further). Instead the canvas always opens at this size and you pan
// — drag, or scroll — to reach rows further down; only the ＋/－ controls
// change the zoom, and only by the amount you actually asked for.
const DEFAULT_ZOOM = 0.8;
const TOP_PADDING = 40;

function TaskGraphInner({ projectId, project, topLevelTasks, childrenOf, onOpenTask }) {
  const { setViewport, getViewport } = useReactFlow();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const flat = useMemo(() => buildFlatTree(project?.name || 'Project', topLevelTasks, childrenOf), [project, topLevelTasks, childrenOf]);
  const byId = useMemo(() => toMap(flat), [flat]);

  const [collapsed, setCollapsed] = useState(() => new Set());
  const [selectedId, setSelectedId] = useState(null);
  const [teamPeople, setTeamPeople] = useState(null);
  const [teamLoading, setTeamLoading] = useState(false);
  // Manual drags override the auto layout for the rest of the session, for
  // just the nodes that were actually moved — "Reset layout" clears these.
  const [manualPositions, setManualPositions] = useState({});

  // Prune collapse/drag state for ids that no longer exist (task deleted
  // elsewhere, template re-applied, etc.).
  useEffect(() => {
    const validIds = new Set(flat.map((n) => n.id));
    setCollapsed((prev) => {
      const next = new Set([...prev].filter((id) => validIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
    setManualPositions((prev) => {
      const next = Object.fromEntries(Object.entries(prev).filter(([id]) => validIds.has(id)));
      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    });
  }, [flat]);

  // Close the details panel (and drop the highlight) with Escape.
  useEffect(() => {
    if (!selectedId) return undefined;
    function onKeyDown(e) { if (e.key === 'Escape') setSelectedId(null); }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId]);

  // Project team is only fetched lazily, the moment the project node is
  // actually selected — every task already carries its own assignee inline.
  useEffect(() => {
    if (selectedId !== ROOT_ID) return;
    setTeamLoading(true);
    fetchProjectMembers(projectId)
      .then((members) => setTeamPeople(members.map((m) => person(m.userId)).filter(Boolean)))
      .finally(() => setTeamLoading(false));
  }, [selectedId, projectId]);

  const visibleIds = useMemo(() => computeVisible(flat, collapsed), [flat, collapsed]);

  // Banded grid: project → tasks (wrapping at 4 per row) → subtasks
  // (wrapping at 4 per row, grouped under their parent) → nested subtasks,
  // each depth on its own band. Manual drags are layered on top.
  const autoPositions = useMemo(() => computeLayout(flat, visibleIds), [flat, visibleIds]);
  const positions = useMemo(() => ({ ...autoPositions, ...manualPositions }), [autoPositions, manualPositions]);

  // A fixed-size viewport, like a real diagramming tool — it never grows or
  // shrinks as tasks are added, expanded or collapsed; the diagram itself
  // zooms to fit inside it instead.
  const canvasHeight = 560;

  const highlightedIds = useMemo(() => {
    if (!selectedId || !byId.has(selectedId)) return null;
    return new Set([selectedId, ...ancestorsOf(selectedId, byId), ...descendantsOf(selectedId, byId)]);
  }, [selectedId, byId]);

  const toggleCollapse = useCallback((id) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const nodes = useMemo(() => {
    return [...visibleIds].map((id) => {
      const n = byId.get(id);
      const pos = positions[id] || { x: 0, y: 0 };
      const w = n.isRoot ? ROOT_W : CARD_W;
      const h = n.isRoot ? ROOT_H : CARD_H;
      const hasSource = n.isRoot || n.childIds.length > 0;
      // Explicit handle geometry (top = incoming from parent, bottom =
      // outgoing to children) — this canvas's element-resize observation
      // isn't reliable, so we hand React Flow exact connection points
      // instead of relying on it to measure them.
      const handles = [];
      if (!n.isRoot) handles.push({ id: 'target', type: 'target', position: 'top', x: w / 2, y: 0, width: 1, height: 1 });
      if (hasSource) handles.push({ id: 'source', type: 'source', position: 'bottom', x: w / 2, y: h, width: 1, height: 1 });
      return {
        id,
        type: 'taskNode',
        position: pos,
        draggable: !n.isRoot,
        width: w,
        height: h,
        measured: { width: w, height: h },
        handles,
        data: {
          task: n.task,
          isRoot: n.isRoot,
          hasChildren: n.childIds.length > 0,
          collapsed: collapsed.has(id),
          childCount: n.childIds.length,
          onToggleCollapse: () => toggleCollapse(id),
          highlighted: !!highlightedIds && highlightedIds.has(id),
          dimmed: !!highlightedIds && !highlightedIds.has(id),
        },
      };
    });
  }, [visibleIds, positions, byId, collapsed, highlightedIds, toggleCollapse]);

  const edges = useMemo(() => {
    const list = [];
    visibleIds.forEach((id) => {
      const n = byId.get(id);
      if (n.parentId && visibleIds.has(n.parentId)) {
        const onPath = !!highlightedIds && highlightedIds.has(n.parentId) && highlightedIds.has(id);
        const dim = !!highlightedIds && !onPath;
        const color = onPath ? EDGE_COLOR_ACTIVE : (dim ? EDGE_COLOR_DIM : EDGE_COLOR_IDLE);
        list.push({
          id: `e-${n.parentId}-${id}`, source: n.parentId, target: id,
          sourceHandle: 'source', targetHandle: 'target', type: 'default',
          style: { stroke: color, strokeWidth: onPath ? 2.2 : 1.4, opacity: dim ? 0.3 : (onPath ? 1 : 0.9) },
          markerEnd: { type: MarkerType.ArrowClosed, color, width: 13, height: 13 },
        });
      }
    });
    return list;
  }, [visibleIds, byId, highlightedIds]);

  // Pans (never rescales) so either a specific node, or — with no
  // `focusId` — the whole tree's top edge, sits centered near the top of
  // the canvas's *actual* current size. We measure the container ourselves
  // rather than rely on React Flow's own fitView/its cached container
  // size, and we apply it instantly (no `duration`): an animated
  // setViewport transitions via requestAnimationFrame internally, which
  // never advances in this environment, silently freezing the viewport
  // wherever it was. Zoom is passed in explicitly only for the two moments
  // it should actually reset (first mount, "Reset layout") — every other
  // call keeps whatever zoom is already active, since panning must never
  // fight the "－"/"＋" controls.
  const center = useCallback((zoomOverride, focusId) => {
    const el = canvasRef.current;
    if (!el || nodes.length === 0) return;
    const { width: w, height: h } = el.getBoundingClientRect();
    if (!w || !h) return;
    const zoom = zoomOverride ?? getViewport().zoom ?? DEFAULT_ZOOM;
    const focusNode = focusId && nodes.find((n) => n.id === focusId);
    if (focusNode) {
      const cx = focusNode.position.x + focusNode.width / 2;
      const cy = focusNode.position.y + focusNode.height / 2;
      setViewport({ x: w / 2 - cx * zoom, y: h / 2 - cy * zoom, zoom });
      return;
    }
    let minX = Infinity, maxX = -Infinity, minY = Infinity;
    nodes.forEach((n) => {
      minX = Math.min(minX, n.position.x);
      maxX = Math.max(maxX, n.position.x + n.width);
      minY = Math.min(minY, n.position.y);
    });
    setViewport({ x: w / 2 - ((minX + maxX) / 2) * zoom, y: TOP_PADDING - minY * zoom, zoom });
  }, [nodes, setViewport, getViewport]);

  // Always call the latest center() — keeps the effects below mount-only
  // so they don't tear down/rebuild (and replay their initial fire) on
  // every click, while still never running a stale closure.
  const centerRef = useRef(center);
  centerRef.current = center;

  // Opens at the default zoom, centered on the tree's top edge. Kept as
  // its own effect (rather than a ref-flag branch inside the one below)
  // because that flag would already read "true" on an effect's *second*
  // invocation under development StrictMode's intentional mount-effect
  // double-invoke, silently skipping the reset — calling this unconditionally
  // is idempotent, so it stays correct no matter how many times it re-fires.
  useEffect(() => {
    centerRef.current(DEFAULT_ZOOM);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recenter whenever the visible tree reshapes (collapse/expand, tasks
  // added/removed) — the container size doesn't change here, only the
  // content bounds do. Keeps whatever zoom is currently active.
  useEffect(() => {
    centerRef.current();
  }, [autoPositions]);

  // Recenter (never rescale) the instant the canvas's own box actually
  // changes size — the details panel opening/closing, which shrinks/grows
  // the canvas as a flex sibling rather than overlaying it. Focuses on the
  // node that was just selected so it stays in view next to the panel;
  // closing the panel (selectedId → null) recenters on the whole tree.
  useEffect(() => {
    centerRef.current(undefined, selectedId);
  }, [selectedId]);

  const onNodeDragStop = useCallback((event, node) => {
    setManualPositions((prev) => ({ ...prev, [node.id]: node.position }));
  }, []);

  const onNodeClick = useCallback((event, node) => {
    setSelectedId((cur) => (cur === node.id ? null : node.id));
  }, []);

  function resetLayout() {
    setManualPositions({});
    setCollapsed(new Set());
    setSelectedId(null);
    // Deferred past this render (setTimeout, not rAF — see note above): the
    // reset just cleared manual positions, and centering needs to read the
    // freshly-recomputed auto layout, not the one from before the click.
    // Zoom resets to the default too — "reset" means everything.
    setTimeout(() => centerRef.current(DEFAULT_ZOOM), 0);
  }

  const selectedNode = selectedId ? byId.get(selectedId) : null;
  const selectedIsRoot = selectedId === ROOT_ID;

  return (
    <div className="tg-layout" style={{ height: canvasHeight }}>
      <div className="tg-canvas-wrap" ref={canvasRef}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeDragStop={onNodeDragStop}
          onNodeClick={onNodeClick}
          onPaneClick={() => setSelectedId(null)}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          zoomOnScroll={false}
          zoomOnDoubleClick={false}
          panOnScroll
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1.4} color="var(--border-strong)" />
          <Controls showInteractive={false} />
          <Panel position="top-right">
            <button className="btn btn-secondary btn-sm" onClick={resetLayout}>Reset layout</button>
          </Panel>
        </ReactFlow>
      </div>

      {selectedNode && (
        <TaskDetailsPanel
          kind={selectedIsRoot ? 'project' : 'task'}
          task={selectedIsRoot ? null : selectedNode.task}
          project={project}
          depthLabel={selectedIsRoot ? null : (depthOf(selectedId, byId) === 0 ? 'Task' : 'Subtask')}
          ownerPerson={selectedIsRoot ? person(project?.ownerId) : person(selectedNode.task.assignee)}
          teamPeople={teamPeople}
          teamLoading={teamLoading}
          onClose={() => setSelectedId(null)}
          onViewFull={() => {
            setSelectedId(null);
            if (selectedIsRoot) navigate(`/projects/${projectId}`);
            else onOpenTask(selectedId);
          }}
        />
      )}
    </div>
  );
}

// The tree is only ever non-empty here (the empty/gallery state is handled
// by the caller), so ReactFlowProvider can wrap unconditionally.
export default function TaskGraph(props) {
  return (
    <ReactFlowProvider>
      <TaskGraphInner {...props} />
    </ReactFlowProvider>
  );
}
