import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

const ToastContext = createContext(null);
let nextId = 1;

// Minimal transient feedback — nothing in the app does this today (existing
// errors are shown inline), used only for "changes saved" confirmations.
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((message, tone = 'good') => {
    const id = nextId++;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div style={{ position: 'fixed', bottom: 20, insetInlineEnd: 20, zIndex: 200, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {toasts.map((t) => (
            <div
              key={t.id} className="card"
              style={{
                padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600,
                color: t.tone === 'critical' ? 'var(--status-critical)' : 'var(--status-good)', boxShadow: 'var(--shadow-lg)',
              }}
            >
              <Icon name={t.tone === 'critical' ? 'i-alert-c' : 'i-check-c'} className="icon icon-sm" />
              {t.message}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
