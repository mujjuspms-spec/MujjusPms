import { useState } from 'react';

// Minimal reusable "show this on hover" popover — reuses the app's existing
// .popover/.popover-wrap styling (see styles/shell.css) so every hover
// tooltip in the app (Timeline bars, Gantt milestones, ...) looks the same
// instead of each screen inventing its own tooltip markup.
export default function HoverCard({ content, children, align = 'start', style }) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="popover-wrap"
      tabIndex={0}
      style={{ position: 'relative', display: 'inline-flex', outline: 'none', ...style }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          className={`popover${align === 'end' ? ' popover-end' : ''}`}
          style={{ top: 'calc(100% + 8px)', minWidth: 200, width: 'max-content', maxWidth: 260, padding: 12, pointerEvents: 'none', zIndex: 80 }}
        >
          {content}
        </div>
      )}
    </span>
  );
}
