import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import Avatar from './Avatar';
import { fetchChatMessages, sendChatMessage } from '../services/chat';
import { onRealtime } from '../services/realtime';
import { useAuth } from '../hooks/useAuth';
import { person } from '../services/people';

// Project-scoped team chat, delivered live over the same SSE stream used
// for task/notification updates — the lightweight, self-contained
// alternative to a two-way Slack bridge (which needs a Slack Events API
// receiver and bot token this app doesn't have).
export default function ChatPanel({ projectId }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState(null);
  const [denied, setDenied] = useState(false);
  const [body, setBody] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    setDenied(false);
    fetchChatMessages(projectId).then(setMessages).catch(() => setDenied(true));
  }, [projectId]);

  useEffect(() => onRealtime((msg) => {
    if (msg.type === 'chat.message' && msg.payload.project === projectId) {
      setMessages((ms) => (ms?.some((m) => m.id === msg.payload.id) ? ms : [...(ms || []), msg.payload]));
    }
  }), [projectId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'nearest' }); }, [messages]);

  async function send() {
    if (!body.trim()) return;
    const message = await sendChatMessage(projectId, body.trim());
    setBody('');
    setMessages((ms) => (ms?.some((m) => m.id === message.id) ? ms : [...(ms || []), message]));
  }

  if (denied) {
    return (
      <div className="card card-pad col items-center justify-center" style={{ height: 520 }}>
        <p style={{ fontSize: 13, color: 'var(--ink-muted)', textAlign: 'center' }}>You need to be a member of this project to see its chat.</p>
      </div>
    );
  }

  return (
    <div className="card card-pad col" style={{ height: 520 }}>
      <div className="grow col gap-10" style={{ overflowY: 'auto', paddingRight: 4 }}>
        {messages === null && <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>Loading…</p>}
        {messages?.length === 0 && <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>No messages yet — say hello.</p>}
        {messages?.map((m) => {
          const author = person(m.authorId);
          const mine = m.authorId === user?.id;
          return (
            <div key={m.id} className="flex items-start gap-10" style={{ flexDirection: mine ? 'row-reverse' : 'row' }}>
              <Avatar person={author} size={26} />
              <div style={{ maxWidth: '70%' }}>
                <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginBottom: 2, textAlign: mine ? 'end' : 'start' }}>{author?.name} · {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                <div style={{ background: mine ? 'var(--brand-500)' : 'var(--surface-2)', color: mine ? '#fff' : 'var(--ink-primary)', borderRadius: 12, padding: '8px 12px', fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word' }}>{m.body}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form className="flex items-center gap-8" style={{ marginTop: 12 }} onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input className="grow" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message the team…" style={{ border: '1px solid var(--border-strong)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '9px 11px', fontSize: 13 }} />
        <button type="submit" className="btn btn-primary btn-sm"><Icon name="i-mail" className="icon icon-sm" />Send</button>
      </form>
    </div>
  );
}
