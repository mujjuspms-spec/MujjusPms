import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const PreferencesContext = createContext(null);
const STORAGE_KEY = 'mujuz-prefs';

const DEFAULTS = {
  dateFormat: 'DD MMM YYYY',
  timeFormat: '12h',
  defaultProjectView: 'overview',
  emailNotifications: true,
  taskNotifications: true,
  deadlineReminders: true,
};

function loadPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

// Same localStorage-backed persistence pattern as useTheme/useI18n — these
// are personal display preferences, not workspace-shared data, so there's
// no backend field for them (consistent with how theme/language already work).
export function PreferencesProvider({ children }) {
  const [prefs, setPrefs] = useState(loadPrefs);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const value = useMemo(() => ({
    prefs,
    setPref: (key, val) => setPrefs((p) => ({ ...p, [key]: val })),
  }), [prefs]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}
