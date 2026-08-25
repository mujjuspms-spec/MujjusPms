import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { HealthLabel } from '../components/Pill';
import Pill from '../components/Pill';
import { fetchPublicProject } from '../services/share';
import { money } from '../utils/format';

// The guest/no-login view a public share link opens — read-only by
// construction (fetchPublicProject hits an endpoint outside requireAuth
// that has no write routes at all), so there's nothing here that could
// leak more than the project's own tasks and progress.
export default function PublicProject() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { fetchPublicProject(token).then(setData).catch((e) => setError(e.message)); }, [token]);

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Link unavailable</div>
        <div style={{ fontSize: 13, color: 'var(--ink-muted)' }}>{error}</div>
      </div>
    );
  }
  if (!data) return <div style={{ padding: 40, fontSize: 13, color: 'var(--ink-muted)' }}>Loading…</div>;

  const { project, tasks } = data;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px' }}>
      <div className="flex items-center gap-8" style={{ marginBottom: 24 }}>
        <div className="brand-mark">M</div>
        <span style={{ fontFamily: 'var(--font-cursive)', fontWeight: 400, fontSize: 20 }}>MujuzPM</span>
        <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>· read-only shared view</span>
      </div>

      <div className="card card-pad" style={{ marginBottom: 20 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{project.name}</div>
          <HealthLabel health={project.health} />
        </div>
        <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 12 }}>{project.desc}</p>
        <div className="meter"><span style={{ width: project.progress + '%' }} /></div>
        <div className="flex justify-between" style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 8 }}>
          <span>{project.progress}% complete</span>
          <span>Due {project.due}</span>
        </div>
      </div>

      <h3 style={{ fontSize: 14, marginBottom: 12 }}>Tasks</h3>
      <div className="col gap-8">
        {tasks.map((tk) => (
          <div key={tk.id} className="card card-pad flex items-center gap-12">
            <Pill status={tk.status} />
            <div className="grow" style={{ fontSize: 13 }}>{tk.title}</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{tk.due}</div>
          </div>
        ))}
        {tasks.length === 0 && <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>No tasks yet.</p>}
      </div>
    </div>
  );
}
