import { useState } from 'react';
import OnboardingLayout from './OnboardingLayout';
import { useWorkspace } from '../../hooks/useWorkspace';

const USE_CASES = ['Project Management', 'Software Development', 'Product Management', 'Marketing', 'Operations', 'Research', 'Consulting', 'Other'];
const VIEWS = ['List', 'Kanban Board', 'Timeline', 'Gantt'];

function toggle(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function WorkPreferences({ onFinish }) {
  const { activeWorkspace, advanceOnboarding } = useWorkspace();
  const [useCase, setUseCase] = useState([]);
  const [views, setViews] = useState([]);
  const [busy, setBusy] = useState(false);

  async function finish() {
    setBusy(true);
    try {
      localStorage.setItem(`mujuz-work-prefs-${activeWorkspace.id}`, JSON.stringify({ useCase, views }));
    } catch { /* best-effort only */ }
    await advanceOnboarding(null);
    onFinish();
  }

  return (
    <OnboardingLayout step={4} totalSteps={4} title="Choose your work preferences" subtitle="This helps us tailor default views — you can change everything later.">
      <p style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 10 }}>What will your team mainly use MujuzPM for?</p>
      <div className="pref-grid">
        {USE_CASES.map((u) => (
          <button key={u} className={`pref-chip${useCase.includes(u) ? ' active' : ''}`} onClick={() => setUseCase((c) => toggle(c, u))}>{u}</button>
        ))}
      </div>
      <p style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 10 }}>How do you prefer to manage work?</p>
      <div className="pref-grid">
        {VIEWS.map((v) => (
          <button key={v} className={`pref-chip${views.includes(v) ? ' active' : ''}`} onClick={() => setViews((c) => toggle(c, v))}>{v}</button>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy} onClick={finish}>
        {busy ? 'Finishing…' : 'Go to Dashboard'}
      </button>
    </OnboardingLayout>
  );
}
