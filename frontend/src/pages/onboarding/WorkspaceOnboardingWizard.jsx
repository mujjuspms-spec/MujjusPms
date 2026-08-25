import { useState } from 'react';
import OnboardingLayout from './OnboardingLayout';
import InviteTeam from './InviteTeam';
import CreateFirstProject from './CreateFirstProject';
import WorkPreferences from './WorkPreferences';
import { useWorkspace } from '../../hooks/useWorkspace';

function WorkspaceReady({ onContinue }) {
  const { activeWorkspace } = useWorkspace();
  return (
    <OnboardingLayout step={1} totalSteps={4} title="Your workspace is ready!">
      <p style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>{activeWorkspace?.name}</p>
      <p style={{ fontSize: 13, color: 'var(--ink-secondary)', marginBottom: 4 }}>You're the workspace admin.</p>
      <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 22 }}>Now let's get your team and first project set up.</p>
      <button className="btn btn-primary" style={{ width: '100%' }} onClick={onContinue}>Continue</button>
    </OnboardingLayout>
  );
}

// Resumable: driven entirely by the workspace's own onboardingStep (backend
// field), not local-only state — closing the browser mid-flow and coming
// back later re-enters at the right step instead of restarting or
// re-creating a workspace.
export default function WorkspaceOnboardingWizard() {
  const { activeWorkspace } = useWorkspace();
  const [localScreen, setLocalScreen] = useState(activeWorkspace?.onboardingStep === 'invite' ? 'ready' : null);

  const step = localScreen || activeWorkspace?.onboardingStep;

  if (step === 'ready') return <WorkspaceReady onContinue={() => setLocalScreen('invite')} />;
  if (step === 'invite') return <InviteTeam onNext={() => setLocalScreen('project')} />;
  if (step === 'project') return <CreateFirstProject onNext={() => setLocalScreen('preferences')} />;
  if (step === 'preferences') return <WorkPreferences onFinish={() => setLocalScreen('done')} />;
  return null;
}
