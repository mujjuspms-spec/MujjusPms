import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch, uploadFile } from '../services/api';
import { supabase } from '../services/supabase';
import { PEOPLE } from '../services/people';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [status, setStatus] = useState('checking'); // checking | signedOut | signedIn
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchMe();
      } else {
        setStatus('signedOut');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        fetchMe();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setStatus('signedOut');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchMe() {
    try {
      const { user: me } = await apiFetch('/api/auth/me');
      setUser(me);
      setStatus('signedIn');
      setError(null);
    } catch (e) {
      if (e.message.includes('awaiting administrator approval') || e.message.includes('registration has been rejected')) {
        // Keep the Supabase session, but mark application status as signedOut so the dashboard is blocked.
        setUser(null);
        setStatus('signedOut');
        setError(e.message);
      } else {
        supabase.auth.signOut();
        setStatus('signedOut');
        setError(e.message);
      }
    }
  }

  async function login(email, password) {
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }

  async function register(name, email, password) {
    setError(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } }
    });
    if (error) throw new Error(error.message);
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  function syncUser(updated) {
    setUser(updated);
    const i = PEOPLE.findIndex((p) => p.id === updated.id);
    if (i !== -1) PEOPLE[i] = updated;
    return updated;
  }

  async function updateProfile(patch) {
    const { user: updated } = await apiFetch('/api/auth/me', { method: 'PATCH', body: JSON.stringify(patch) });
    return syncUser(updated);
  }

  async function uploadAvatar(file) {
    const { user: updated } = await uploadFile('/api/people/me/avatar', file);
    return syncUser(updated);
  }

  async function removeAvatar() {
    const { user: updated } = await apiFetch('/api/people/me/avatar', { method: 'DELETE' });
    return syncUser(updated);
  }

  async function changePassword(currentPassword, newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
    return user;
  }

  const value = useMemo(() => ({
    status, signedIn: status === 'signedIn', user, error, setError,
    login, register, logout, updateProfile, uploadAvatar, removeAvatar, changePassword,
  }), [status, user, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
