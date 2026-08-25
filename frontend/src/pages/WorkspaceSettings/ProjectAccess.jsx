import { useEffect, useState } from 'react';
import ProjectAssignmentModal from '../../components/ProjectAssignmentModal';
import { PROJECTS, fetchProjectMembers } from '../../services/projects';
import { fetchWorkspaceMembers } from '../../services/workspaces';
import { SectionCard } from './shared';

const ROLE_LABEL = { ADMIN: 'Admin', MEMBER: 'Member', VIEWER: 'Viewer' };

export default function ProjectAccess({ workspaceId }) {
  const [members, setMembers] = useState(null);
  const [assignedProjects, setAssignedProjects] = useState({});
  const [managing, setManaging] = useState(null);

  useEffect(() => {
    fetchWorkspaceMembers(workspaceId).then(setMembers);
  }, [workspaceId]);

  useEffect(() => {
    (async () => {
      const byUser = {};
      for (const pr of PROJECTS) {
        const rows = await fetchProjectMembers(pr.id);
        for (const m of rows) {
          if (!byUser[m.userId]) byUser[m.userId] = [];
          byUser[m.userId].push(pr.name);
        }
      }
      setAssignedProjects(byUser);
    })();
  }, []);

  return (
    <SectionCard title="Project Access" description="Control which projects Member and Viewer users can access. Admins automatically have access to every project.">
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'start', color: 'var(--ink-muted)', fontSize: 11.5, borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '9px 10px' }}>Member</th>
              <th style={{ padding: '9px 10px' }}>Role</th>
              <th style={{ padding: '9px 10px' }}>Assigned Projects</th>
              <th style={{ padding: '9px 10px' }}>Access Count</th>
              <th style={{ padding: '9px 10px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(members || []).map((m) => {
              const isAdminRow = m.role === 'ADMIN';
              const names = assignedProjects[m.userId] || [];
              return (
                <tr key={m.userId} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '9px 10px', fontWeight: 600 }}>{m.name}</td>
                  <td style={{ padding: '9px 10px' }}><span className="pill pill-done" style={{ padding: '2px 8px' }}>{ROLE_LABEL[m.role]}</span></td>
                  <td style={{ padding: '9px 10px', color: 'var(--ink-muted)' }}>{isAdminRow ? 'All Projects' : (names.join(', ') || '—')}</td>
                  <td style={{ padding: '9px 10px' }}>{isAdminRow ? 'Automatic' : names.length}</td>
                  <td style={{ padding: '9px 10px' }}>
                    {!isAdminRow && <button className="btn btn-secondary btn-sm" onClick={() => setManaging(m)}>Manage Access</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {managing && (
        <ProjectAssignmentModal
          personId={managing.userId} personName={managing.name}
          onClose={() => {
            setManaging(null);
            fetchWorkspaceMembers(workspaceId).then(async (rows) => {
              setMembers(rows);
              const byUser = {};
              for (const pr of PROJECTS) {
                // eslint-disable-next-line no-await-in-loop
                const prMembers = await fetchProjectMembers(pr.id);
                for (const pm of prMembers) { if (!byUser[pm.userId]) byUser[pm.userId] = []; byUser[pm.userId].push(pr.name); }
              }
              setAssignedProjects(byUser);
            });
          }}
        />
      )}
    </SectionCard>
  );
}
