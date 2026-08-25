import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { useWorkspace } from './useWorkspace';
import * as api from '../services/tasks';
import { computeCriticalPath } from '../utils/criticalPath';
import { connectRealtime, disconnectRealtime, onRealtime } from '../services/realtime';

const TasksContext = createContext(null);

export function TasksProvider({ children }) {
  const { signedIn } = useAuth();
  const { screen, switchCount } = useWorkspace();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  function refresh() {
    return api.fetchAllTasks().then(setTasks);
  }

  // Refetches whenever a workspace is actively resolved, AND again every
  // time the user switches workspace (switchCount) — otherwise task data
  // from the previous workspace would linger until a manual page reload.
  useEffect(() => {
    if (!signedIn || screen !== 'app') { setTasks([]); disconnectRealtime(); return; }
    setLoading(true);
    refresh().finally(() => setLoading(false));
    connectRealtime();
    return () => disconnectRealtime();
  }, [signedIn, screen, switchCount]);

  function upsert(task) {
    setTasks((ts) => {
      const i = ts.findIndex((t) => t.id === task.id);
      if (i === -1) return [...ts, task];
      const next = ts.slice();
      next[i] = task;
      return next;
    });
  }

  // Live task changes made by anyone else — board columns, lists and the
  // Gantt all update on their own without a page reload.
  useEffect(() => {
    if (!signedIn) return;
    return onRealtime((msg) => {
      if (msg.type === 'task.created' || msg.type === 'task.updated') upsert(msg.payload);
      else if (msg.type === 'task.deleted') {
        const ids = msg.payload.deletedIds || [msg.payload.id];
        setTasks((ts) => ts.filter((t) => !ids.includes(t.id)));
      }
    });
  }, [signedIn]);

  const value = {
    tasks, loading, refresh,
    getTask: (id) => tasks.find((t) => t.id === id),
    childrenOf: (parentId) => tasks.filter((t) => t.parentId === parentId),
    // Top-level tasks only — subtasks are nested tasks and don't show as
    // standalone board/list/gantt cards. Ordered for the roadmap view.
    tasksForProject: (pid) => tasks
      .filter((t) => t.project === pid && !t.parentId)
      .sort((a, b) => (a.order - b.order) || (new Date(a.createdAt) - new Date(b.createdAt))),
    criticalPathFor: (pid) => computeCriticalPath(tasks.filter((t) => t.project === pid && !t.parentId)),

    updateTaskStatus: async (id, status) => upsert(await api.updateTask(id, { status })),
    updateTaskField: async (id, patch) => upsert(await api.updateTask(id, patch)),

    addTask: async (partial) => {
      const task = await api.createTask(partial);
      setTasks((ts) => [...ts, task]);
      return task;
    },
    addSubtask: async (parentTask, title) => {
      const task = await api.createTask({ project: parentTask.project, parentId: parentTask.id, title, status: 'todo', assignee: parentTask.assignee });
      setTasks((ts) => [...ts, task]);
      return task;
    },
    removeTask: async (id) => {
      const { deletedIds } = await api.deleteTask(id);
      setTasks((ts) => ts.filter((t) => !deletedIds.includes(t.id)));
    },
    moveTask: async (id, direction) => {
      await api.moveTask(id, direction);
      await refresh();
    },
  };

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasksStore() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasksStore must be used within TasksProvider');
  return ctx;
}
