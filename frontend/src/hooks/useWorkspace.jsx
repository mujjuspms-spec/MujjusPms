import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import {
  getActiveWorkspaceId, setActiveWorkspaceId, clearWorkspaceState,
  fetchMyMemberships, fetchPendingInvitations, createWorkspace as createWorkspaceApi,
  acceptInvitation as acceptInvitationApi, declineInvitation as declineInvitationApi,
  setOnboardingStep,
} from '../services/workspaces';
import { fetchPeople } from '../services/people';
import { fetchProjects } from '../services/projects';
import { onRealtime } from '../services/realtime';

// Workspace-scoped data (people/projects) is only ever safe to fetch once
// a workspace is actively resolved — X-Workspace-Id has to be set first,
// or these calls would 400 against the new requireWorkspaceContext guard.
async function loadWorkspaceData() {
  await Promise.all([fetchPeople(), fetchProjects()]);
}

const WorkspaceContext = createContext(null);

// screen: 'checking' | 'invitation' | 'chooser' | 'onboarding' | 'app'
export function WorkspaceProvider({ children }) {
  const { signedIn, user } = useAuth();
  const [screen, setScreen] = useState('checking');
  const [memberships, setMemberships] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  // Bumped on every workspace switch/creation so other providers (tasks,
  // people, projects) know to refetch even though `signedIn` didn't change.
  const [switchCount, setSwitchCount] = useState(0);

  const resolve = useCallback(async () => {
    setScreen('checking');
    const list = await fetchMyMemberships();

    if (list.length === 0) {
      const pending = await fetchPendingInvitations();
      setPendingInvitations(pending);
      setMemberships([]);
      setActiveWorkspace(null);
      if (pending.length === 1) { setScreen('invitation'); return; }
      if (pending.length > 1) { setScreen('chooser'); return; }
      setScreen('onboarding');
      return;
    }

    const lastId = getActiveWorkspaceId();
    const match = list.find((m) => m.workspace.id === lastId);
    const active = match || list[0];
    setActiveWorkspaceId(active.workspace.id);
    setMemberships(list);
    setActiveWorkspace({ ...active.workspace, role: active.role });
    await loadWorkspaceData();
    setScreen('app');
  }, []);

  useEffect(() => {
    if (!signedIn) {
      clearWorkspaceState();
      setMemberships([]);
      setActiveWorkspace(null);
      setPendingInvitations([]);
      setScreen('checking');
      return;
    }
    resolve();
  }, [signedIn, resolve]);

  // Live permission update: when this user's own role changes (or they're
  // removed) in their active workspace, re-resolve immediately — no logout
  // needed. Sidebar/project-permissions/member-management all read off this
  // same context value, so one refresh here is enough for all of them.
  useEffect(() => {
    if (!signedIn || !user) return;
    return onRealtime((msg) => {
      if (msg.type !== 'workspace.member.role_changed' && msg.type !== 'workspace.member.removed') return;
      if (msg.payload.userId !== user.id) return;
      if (msg.payload.workspaceId !== getActiveWorkspaceId()) return;
      resolve();
    });
  }, [signedIn, user, resolve]);

  async function switchWorkspace(workspaceId) {
    const m = memberships.find((x) => x.workspace.id === workspaceId);
    if (!m) return;
    setActiveWorkspaceId(workspaceId);
    setActiveWorkspace({ ...m.workspace, role: m.role });
    await loadWorkspaceData();
    setSwitchCount((c) => c + 1);
  }

  async function createNewWorkspace(payload) {
    const { workspace } = await createWorkspaceApi(payload);
    setActiveWorkspaceId(workspace.id);
    await resolve();
    setSwitchCount((c) => c + 1);
    return workspace;
  }

  async function joinInvitation(token) {
    const { workspace } = await acceptInvitationApi(token);
    setActiveWorkspaceId(workspace.id);
    await resolve();
    return workspace;
  }

  async function declineInvitationFlow(token) {
    await declineInvitationApi(token);
    await resolve();
  }

  async function advanceOnboarding(step) {
    if (!activeWorkspace) return;
    const { workspace } = await setOnboardingStep(activeWorkspace.id, step);
    setActiveWorkspace((w) => (w ? { ...w, onboardingStep: workspace.onboardingStep } : w));
  }

  const isWorkspaceAdmin = activeWorkspace?.role === 'ADMIN';
  const isWorkspaceMember = activeWorkspace?.role === 'MEMBER';
  const isWorkspaceViewer = activeWorkspace?.role === 'VIEWER';

  const value = {
    screen, memberships, activeWorkspace, pendingInvitations, switchCount,
    role: activeWorkspace?.role || null, isWorkspaceAdmin, isWorkspaceMember, isWorkspaceViewer,
    switchWorkspace, createWorkspace: createNewWorkspace, joinInvitation, declineInvitation: declineInvitationFlow,
    advanceOnboarding, refreshMemberships: resolve,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}
