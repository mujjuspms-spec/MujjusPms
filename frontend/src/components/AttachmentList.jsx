import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { fetchAttachments, uploadAttachment, deleteAttachment } from '../services/tasks';
import { downloadUrl } from '../services/api';

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AttachmentList({ taskId, compact = false, readOnly = false }) {
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { fetchAttachments(taskId).then(setFiles); }, [taskId]);

  async function onPick(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const record = await uploadAttachment(taskId, file);
      setFiles((f) => [...f, record]);
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(id) {
    await deleteAttachment(id);
    setFiles((f) => f.filter((a) => a.id !== id));
  }

  return (
    <div className="col gap-6">
      {files.map((a) => (
        <div key={a.id} className="flex items-center gap-8" style={{ fontSize: compact ? 11.5 : 12.5 }}>
          <Icon name="i-paperclip" className="icon icon-sm" style={{ color: 'var(--ink-muted)', flex: '0 0 auto' }} />
          <a href={downloadUrl(a.id)} className="grow truncate" style={{ color: 'var(--brand-600)' }} target="_blank" rel="noreferrer">{a.filename}</a>
          <span style={{ color: 'var(--ink-muted)', flex: '0 0 auto' }}>{fmtSize(a.size)}</span>
          {!readOnly && (
            <button className="btn-icon" style={{ width: 22, height: 22 }} onClick={() => onRemove(a.id)}><Icon name="i-x" className="icon icon-sm" /></button>
          )}
        </div>
      ))}
      {!readOnly && (
        <div>
          <input ref={inputRef} type="file" hidden onChange={onPick} />
          <button className="btn btn-ghost btn-sm" style={{ padding: compact ? '3px 8px' : undefined, fontSize: compact ? 11 : undefined }} disabled={busy} onClick={() => inputRef.current?.click()}>
            <Icon name="i-upload" className="icon icon-sm" />{busy ? 'Uploading…' : 'Attach file'}
          </button>
        </div>
      )}
    </div>
  );
}
