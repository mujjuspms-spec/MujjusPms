import { useEffect } from 'react';

// Landing point for the real Google/Microsoft OAuth flow — the backend
// redirects here with a fresh session token after a successful sign-in.
// A hard reload (not client-side navigate) lets AuthProvider's normal
// bootstrap-on-mount effect pick up the new token from scratch.
export default function AuthCallback() {
  useEffect(() => {
    // If we land here with Supabase Auth, Supabase handles the session natively.
    window.location.href = '/dashboard';
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--ink-muted)', fontSize: 13 }}>
      Signing you in…
    </div>
  );
}
