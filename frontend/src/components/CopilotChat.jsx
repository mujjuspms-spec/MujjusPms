import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { fetchAiStatus, askCopilot } from '../services/ai';

export default function CopilotChat({ onClose }) {
  const navigate = useNavigate();
  const [configured, setConfigured] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => { fetchAiStatus().then(setConfigured); }, []);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setError(null);
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setBusy(true);
    try {
      const reply = await askCopilot(text, history);
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ width: 560, display: 'flex', flexDirection: 'column', height: 620, maxHeight: '86vh' }}>
        <div className="modal-head">
          <div className="flex items-center gap-8">
            <span className="ai-badge"><Icon name="i-sparkle" className="icon icon-sm" />AI Copilot</span>
          </div>
          <button className="btn-icon" onClick={onClose}><Icon name="i-x" className="icon icon-sm" /></button>
        </div>

        {configured === null && <div className="modal-body" style={{ flex: 1 }} />}

        {configured === false && (
          <div className="modal-body col gap-12" style={{ flex: 1, justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
            <Icon name="i-sparkle" className="icon-lg" style={{ color: 'var(--ink-muted)' }} />
            <p style={{ fontSize: 13, color: 'var(--ink-secondary)', maxWidth: 340 }}>
              Copilot requires a Serper API key to perform web searches. The server administrator must configure <code>SERPER_API_KEY</code> in the backend environment.
            </p>
            <button className="btn btn-primary btn-sm" onClick={() => { onClose(); navigate('/settings/integrations'); }}>View Integrations</button>
          </div>
        )}

        {configured === true && (
          <>
            <div ref={scrollRef} className="col gap-14" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {messages.length === 0 && (
                <p style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>
                  Ask about anything in your portfolio (e.g., "what tasks are blocked?") or search the web for current information (e.g., "what are the latest PM trends?").
                </p>
              )}
              {messages.map((m, i) => (
                <div key={i} className="flex" style={{ justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '82%', fontSize: 13, lineHeight: 1.55, padding: '9px 13px', borderRadius: 12, whiteSpace: 'pre-wrap',
                    background: m.role === 'user' ? 'var(--brand-gradient)' : 'var(--surface-2)',
                    color: m.role === 'user' ? '#fff' : 'var(--ink-primary)',
                    border: m.role === 'user' ? 'none' : '1px solid var(--border)',
                  }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {busy && <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Copilot is thinking…</div>}
              {error && <div style={{ fontSize: 12, color: 'var(--status-critical)' }}>{error}</div>}
            </div>
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
              <div className="flex gap-8">
                <input
                  autoFocus value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
                  placeholder="Ask about your portfolio or search the web…"
                  style={{ flex: 1, border: '1px solid var(--border-strong)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '9px 11px', fontSize: 13, color: 'var(--ink-primary)' }}
                />
                <button className="btn btn-primary btn-sm" onClick={send} disabled={busy || !input.trim()}>Send</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
