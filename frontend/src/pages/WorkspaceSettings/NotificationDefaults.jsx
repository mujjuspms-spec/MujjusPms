import { useState } from 'react';
import { useToast } from '../../components/Toast';
import { updateNotificationDefaults } from '../../services/workspaceSettings';
import { SectionCard, SaveButton, ToggleRow } from './shared';

const ROWS = [
  ['taskAssignment', 'Task Assignment'],
  ['taskDueSoon', 'Task Due Soon'],
  ['taskOverdue', 'Task Overdue'],
  ['projectStatusChange', 'Project Status Change'],
  ['projectDeadline', 'Project Deadline'],
  ['commentsMentions', 'Comments / Mentions'],
  ['invitationUpdates', 'Invitation Updates'],
  ['timesheetSubmission', 'Timesheet Submission'],
  ['timesheetApproval', 'Timesheet Approval'],
];

// Task Assignment and Comments/Mentions already fire real in-app
// notifications today (tasks.js / comments.js) and are gated by this
// setting; the rest are stored so they're ready the moment their
// underlying trigger exists (e.g. a due-date checker), not faked as active.
const ENFORCED = new Set(['taskAssignment', 'commentsMentions']);

export default function NotificationDefaults({ data, setData, workspaceId }) {
  const { show } = useToast();
  const n = data.settings.notifications;
  const [draft, setDraft] = useState(() => ({ ...n }));
  const [saving, setSaving] = useState(false);

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const res = await updateNotificationDefaults(workspaceId, draft);
      setData((d) => ({ ...d, settings: { ...d.settings, notifications: res.settings.notifications } }));
      show('Notification defaults saved');
    } catch (e) {
      show(e.message || 'Could not save your changes', 'critical');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard title="Notifications" description="Workspace defaults for what triggers a notification. Only In-App notifications are delivered today — there is no email sender yet, so an Email channel isn't offered.">
      {ROWS.map(([key, label]) => (
        <ToggleRow
          key={key} label={label} checked={draft[key]} onChange={(v) => setDraft((d) => ({ ...d, [key]: v }))}
          hint={!ENFORCED.has(key) ? "Saved as a preference — this workspace doesn't have an automatic trigger for this event yet." : undefined}
        />
      ))}
      <p style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 10 }}>Members can still override their own notification preferences from their Profile.</p>
      <div style={{ marginTop: 14 }}><SaveButton saving={saving} onClick={save} /></div>
    </SectionCard>
  );
}
