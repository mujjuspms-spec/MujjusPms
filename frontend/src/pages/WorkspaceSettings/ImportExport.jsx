import { useState } from 'react';
import Icon from '../../components/Icon';
import { useToast } from '../../components/Toast';
import { getToken } from '../../services/api';
import { SectionCard } from './shared';

const KINDS = [
  { kind: 'projects', label: 'Projects' },
  { kind: 'tasks', label: 'Tasks' },
  { kind: 'members', label: 'Members' },
];

export default function ImportExport({ workspaceId }) {
  const { show } = useToast();
  const [busy, setBusy] = useState(null);

  // Fetched as a blob (not a plain <a href>) since the export route needs
  // the X-Workspace-Id header, which a normal browser navigation can't send.
  async function download(kind) {
    setBusy(kind);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/settings/export/${kind}`, {
        headers: { Authorization: `Bearer ${getToken()}`, 'X-Workspace-Id': workspaceId },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${kind}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      show(e.message || 'Could not export this data', 'critical');
    } finally {
      setBusy(null);
    }
  }

  return (
    <SectionCard title="Import / Export" description="Export this workspace's data as .xlsx. There is no import yet — building it out is future work.">
      <div className="col gap-8">
        {KINDS.map(({ kind, label }) => (
          <button key={kind} className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }} disabled={busy === kind} onClick={() => download(kind)}>
            <Icon name="i-download" className="icon icon-sm" /> {busy === kind ? 'Exporting…' : `Export ${label} (.xlsx)`}
          </button>
        ))}
      </div>
    </SectionCard>
  );
}
