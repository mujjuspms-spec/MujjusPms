import { useToast } from '../../components/Toast';

// A boolean settings row using the same `.switch` control already used in
// Profile.jsx / Settings.jsx — no new toggle component needed.
export function ToggleRow({ label, hint, checked, onChange, disabled }) {
  return (
    <div className="flex items-center justify-between" style={{ padding: '8px 0' }}>
      <div>
        <div style={{ fontSize: 13 }}>{label}</div>
        {hint && <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 2 }}>{hint}</div>}
      </div>
      <div
        className={`switch${checked ? ' on' : ''}`} onClick={disabled ? undefined : () => onChange(!checked)}
        style={disabled ? { opacity: 0.5, cursor: 'default' } : undefined}
      ><i /></div>
    </div>
  );
}

export function SectionCard({ title, description, children }) {
  return (
    <div className="card card-pad" style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 14.5, marginBottom: description ? 4 : 14 }}>{title}</h3>
      {description && <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 14 }}>{description}</p>}
      {children}
    </div>
  );
}

// Shared "draft state → PATCH → toast" save button, matching the pattern
// already established in Profile.jsx's section saves.
export function SaveButton({ saving, onClick, label = 'Save changes' }) {
  return (
    <button className="btn btn-primary btn-sm" disabled={saving} onClick={onClick}>
      {saving ? 'Saving…' : label}
    </button>
  );
}

export function useSectionSave(mutateFn, successMessage) {
  const { show } = useToast();
  return async function run(workspaceId, patch, onSuccess) {
    try {
      const res = await mutateFn(workspaceId, patch);
      show(successMessage);
      onSuccess?.(res);
      return res;
    } catch (e) {
      show(e.message || 'Could not save your changes', 'critical');
      throw e;
    }
  };
}
