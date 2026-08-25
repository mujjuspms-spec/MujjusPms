import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import IconSprite from './components/IconSprite';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import QuickAddModal from './components/QuickAddModal';
import CommandPalette from './components/CommandPalette';
import CopilotChat from './components/CopilotChat';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AuthCallback from './pages/AuthCallback';
import ApiAccess from './pages/ApiAccess';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Board from './pages/Board';
import ListView from './pages/ListView';
import Timeline from './pages/Timeline';
import CalendarPage from './pages/CalendarPage';
import Workload from './pages/Workload';
import Team from './pages/Team';
import MemberTimesheet from './pages/MemberTimesheet';
import Timesheets from './pages/Timesheets';
import Profile from './pages/Profile';
import Goals from './pages/Goals';
import Reports from './pages/Reports';
import Budgets from './pages/Budgets';
import ProjectBudget from './pages/ProjectBudget';
import Automations from './pages/Automations';
import WorkspaceSettings from './pages/WorkspaceSettings';
import IntegrationsPage from './pages/Integrations';
import Issues from './pages/Issues';
import MyApprovals from './pages/MyApprovals';
import PublicProject from './pages/PublicProject';
import { I18nProvider } from './hooks/useI18n';
import { ThemeProvider } from './hooks/useTheme';
import { PreferencesProvider } from './hooks/usePreferences';
import { ToastProvider } from './components/Toast';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { WorkspaceProvider, useWorkspace } from './hooks/useWorkspace';
import { TasksProvider } from './hooks/useTasksStore';
import CreateWorkspace from './pages/onboarding/CreateWorkspace';
import InvitationScreen from './pages/onboarding/InvitationScreen';
import ChooserScreen from './pages/onboarding/ChooserScreen';
import WorkspaceOnboardingWizard from './pages/onboarding/WorkspaceOnboardingWizard';

function AppShell() {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div id="app-shell">
      <Sidebar onOpenCopilot={() => setCopilotOpen(true)} mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />
      <div id="main-col">
        <Topbar onNewTask={() => setQuickAddOpen(true)} onOpenPalette={() => setPaletteOpen(true)} onToggleMobileNav={() => setMobileNavOpen((v) => !v)} />
        <div id="view-root" tabIndex={-1}>
          <Outlet context={{ openCopilot: () => setCopilotOpen(true) }} />
        </div>
      </div>
      {quickAddOpen && <QuickAddModal onClose={() => setQuickAddOpen(false)} />}
      {paletteOpen && (
        <CommandPalette
          onClose={() => setPaletteOpen(false)}
          onNewTask={() => setQuickAddOpen(true)}
          onOpenCopilot={() => setCopilotOpen(true)}
        />
      )}
      {copilotOpen && <CopilotChat onClose={() => setCopilotOpen(false)} />}
    </div>
  );
}

function RequireAuth({ children }) {
  const { status } = useAuth();
  if (status === 'checking') {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--ink-muted)', fontSize: 13 }}>Loading MujuzPM…</div>;
  }
  if (status === 'signedOut') return <Navigate to="/login" replace />;
  return children;
}

function RedirectIfAuthed({ children }) {
  const { status } = useAuth();
  if (status === 'checking') {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--ink-muted)', fontSize: 13 }}>Loading MujuzPM…</div>;
  }
  if (status === 'signedIn') return <Navigate to="/dashboard" replace />;
  return children;
}

const LOADING = <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--ink-muted)', fontSize: 13 }}>Loading MujuzPM…</div>;

// Gates on the resolved workspace state — a signed-in user never sees the
// app shell until membership/invitation resolution is done. This is the
// piece that replaces the old "just show whatever's there" behavior: no
// membership + no invitation always means the create-workspace screen,
// never an existing workspace's data.
function RequireWorkspace({ children }) {
  const { screen, activeWorkspace, role } = useWorkspace();
  if (screen === 'checking') return LOADING;
  if (screen === 'invitation') return <InvitationScreen />;
  if (screen === 'chooser') return <ChooserScreen />;
  if (screen === 'onboarding') return <CreateWorkspace />;
  // screen === 'app' from here — but a fresh Admin may still be mid-wizard.
  if (activeWorkspace?.onboardingStep && role === 'ADMIN') return <WorkspaceOnboardingWizard />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
      <Route path="/signup" element={<RedirectIfAuthed><Signup /></RedirectIfAuthed>} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/share/:token" element={<PublicProject />} />
      <Route element={<RequireAuth><RequireWorkspace><AppShell /></RequireWorkspace></RequireAuth>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/board" element={<Board />} />
        <Route path="/list" element={<ListView />} />
        <Route path="/timeline" element={<Timeline />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/workload" element={<Workload />} />
        <Route path="/team" element={<Team />} />
        <Route path="/team/:id" element={<MemberTimesheet />} />
        <Route path="/timesheets" element={<Timesheets />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/issues" element={<Issues />} />
        <Route path="/approvals" element={<MyApprovals />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/budgets" element={<Budgets />} />
        <Route path="/budgets/:id" element={<ProjectBudget />} />
        <Route path="/automations" element={<Automations />} />
        <Route path="/audit-log" element={<Navigate to="/settings/workspace/audit-log" replace />} />
        <Route path="/settings" element={<Navigate to="/settings/workspace/general" replace />} />
        <Route path="/settings/workspace/:section?" element={<WorkspaceSettings />} />
        <Route path="/settings/integrations" element={<IntegrationsPage />} />
        <Route path="/settings/api" element={<ApiAccess />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <PreferencesProvider>
          <ToastProvider>
            <AuthProvider>
              <WorkspaceProvider>
                <TasksProvider>
                  <BrowserRouter>
                    <IconSprite />
                    <a href="#view-root" className="skip-link">Skip to main content</a>
                    <AppRoutes />
                  </BrowserRouter>
                </TasksProvider>
              </WorkspaceProvider>
            </AuthProvider>
          </ToastProvider>
        </PreferencesProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
