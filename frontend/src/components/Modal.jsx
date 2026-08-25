import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

// Rendered via a portal to document.body so it's never subject to an
// ancestor's `transform`/`filter`/`backdrop-filter` establishing a new
// containing block for our `position:fixed` overlay (e.g. #sidebar's
// backdrop-filter, which broke centering when a modal was opened from
// inside the sidebar tree).
export default function Modal({ title, onClose, children, footer, busy = false, width }) {
  const modalRef = useRef(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const first = modalRef.current?.querySelector(FOCUSABLE);
    (first || modalRef.current)?.focus();
    return () => { previouslyFocused?.focus?.(); };
  }, []);

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      if (busy) return;
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key === 'Tab') {
      const focusable = Array.from(modalRef.current?.querySelectorAll(FOCUSABLE) || []);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  return createPortal(
    <div
      className="overlay"
      onMouseDown={(e) => { if (!busy && e.target === e.currentTarget) onClose(); }}
      onKeyDown={handleKeyDown}
    >
      <div
        className="modal" ref={modalRef} style={width ? { width, maxWidth: 'calc(100% - 32px)' } : undefined}
        role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1}
      >
        <div className="modal-head">
          <h3 id="modal-title" style={{ fontSize: 15 }}>{title}</h3>
          <button className="btn-icon" onClick={onClose} disabled={busy} aria-label="Close"><Icon name="i-x" className="icon icon-sm" /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
