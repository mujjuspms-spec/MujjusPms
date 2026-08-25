import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import Avatar from './Avatar';
import { useAuth } from '../hooks/useAuth';
import { PEOPLE, person } from '../services/people';
import { fetchComments, createComment, updateComment, deleteComment } from '../services/comments';

function timeAgo(iso) {
  const d = new Date(iso);
  const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return d.toLocaleDateString();
}

// Renders a comment body as text nodes + highlighted @Name spans, matching
// against known people (longest name first so multi-word names win).
function renderBody(text) {
  const names = [...PEOPLE].map((p) => p.name).sort((a, b) => b.length - a.length);
  if (names.length === 0) return text;
  const pattern = new RegExp(`(@(?:${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')}))`, 'g');
  const parts = text.split(pattern);
  return parts.map((part, i) => {
    if (part.startsWith('@') && names.includes(part.slice(1))) {
      return <span key={i} style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>{part}</span>;
    }
    return <span key={i}>{part}</span>;
  });
}

function MentionComposer({ onSubmit, initialValue = '', onCancel, submitLabel = 'Comment' }) {
  const [value, setValue] = useState(initialValue);
  const [mentionQuery, setMentionQuery] = useState(null);
  const textareaRef = useRef(null);

  const suggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return PEOPLE.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 5);
  }, [mentionQuery]);

  function onChange(e) {
    const v = e.target.value;
    setValue(v);
    const upToCursor = v.slice(0, e.target.selectionStart);
    const match = /@([\w .]*)$/.exec(upToCursor);
    setMentionQuery(match ? match[1] : null);
  }

  function pickMention(p) {
    const cursor = textareaRef.current.selectionStart;
    const upToCursor = value.slice(0, cursor);
    const rest = value.slice(cursor);
    const replaced = upToCursor.replace(/@([\w .]*)$/, `@${p.name} `);
    const next = replaced + rest;
    setValue(next);
    setMentionQuery(null);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function submit() {
    if (!value.trim()) return;
    onSubmit(value.trim());
    setValue('');
    setMentionQuery(null);
  }

  return (
    <div style={{ position: 'relative' }}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && mentionQuery === null) { e.preventDefault(); submit(); }
          if (e.key === 'Escape' && onCancel) onCancel();
        }}
        placeholder="Write a comment… type @ to mention someone"
        rows={2}
        style={{ width: '100%', resize: 'vertical', fontSize: 13, border: '1px solid var(--border-strong)', borderRadius: 8, padding: '8px 10px', background: 'var(--surface-2)', color: 'var(--ink-primary)', fontFamily: 'inherit' }}
      />
      {suggestions.length > 0 && (
        <div className="card" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, marginTop: 4, padding: 6, maxHeight: 180, overflowY: 'auto' }}>
          {suggestions.map((p) => (
            <div key={p.id} className="dd-item" style={{ padding: '7px 8px' }} onMouseDown={(e) => { e.preventDefault(); pickMention(p); }}>
              <Avatar person={p} size={20} /><span style={{ fontSize: 12.5 }}>{p.name}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-between items-center" style={{ marginTop: 6 }}>
        <span style={{ fontSize: 10.5, color: 'var(--ink-muted)' }}>Enter to send · Shift+Enter for a new line</span>
        <div className="flex gap-6">
          {onCancel && <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>}
          <button className="btn btn-primary btn-sm" onClick={submit} disabled={!value.trim()}>{submitLabel}</button>
        </div>
      </div>
    </div>
  );
}

export default function CommentThread({ taskId, readOnly = false }) {
  const { user } = useAuth();
  const [comments, setComments] = useState(null);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => { fetchComments(taskId).then(setComments); }, [taskId]);

  async function post(body) {
    const c = await createComment(taskId, body);
    setComments((cs) => [...(cs || []), c]);
  }
  async function saveEdit(id, body) {
    const c = await updateComment(id, body);
    setComments((cs) => cs.map((x) => (x.id === id ? c : x)));
    setEditingId(null);
  }
  async function remove(id) {
    if (!window.confirm('Delete this comment? This can\'t be undone.')) return;
    await deleteComment(id);
    setComments((cs) => cs.filter((x) => x.id !== id));
  }

  return (
    <div className="col gap-12">
      {comments === null && <p style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Loading comments…</p>}
      {comments?.length === 0 && <p style={{ fontSize: 12, color: 'var(--ink-muted)' }}>No comments yet — mention someone with @ to pull them in.</p>}
      {comments?.map((c) => {
        const author = person(c.authorId);
        const mine = c.authorId === user?.id;
        return (
          <div key={c.id} className="flex items-start gap-10">
            <Avatar person={author} size={26} />
            <div className="grow">
              <div className="flex items-center gap-8">
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>{author?.name}</span>
                <span style={{ fontSize: 10.5, color: 'var(--ink-muted)' }}>{timeAgo(c.createdAt)}{c.editedAt ? ' · edited' : ''}</span>
              </div>
              {editingId === c.id ? (
                <div style={{ marginTop: 4 }}>
                  <MentionComposer initialValue={c.body} submitLabel="Save" onCancel={() => setEditingId(null)} onSubmit={(body) => saveEdit(c.id, body)} />
                </div>
              ) : (
                <p style={{ fontSize: 13, lineHeight: 1.55, marginTop: 2, whiteSpace: 'pre-wrap' }}>{renderBody(c.body)}</p>
              )}
              {mine && !readOnly && editingId !== c.id && (
                <div className="flex gap-10" style={{ marginTop: 3 }}>
                  <button className="btn-ghost" style={{ border: 0, background: 'none', cursor: 'pointer', fontSize: 10.5, color: 'var(--ink-muted)', padding: 0 }} onClick={() => setEditingId(c.id)}>Edit</button>
                  <button className="btn-ghost" style={{ border: 0, background: 'none', cursor: 'pointer', fontSize: 10.5, color: 'var(--ink-muted)', padding: 0 }} onClick={() => remove(c.id)}>Delete</button>
                </div>
              )}
            </div>
          </div>
        );
      })}
      {!readOnly && <MentionComposer onSubmit={post} />}
    </div>
  );
}
