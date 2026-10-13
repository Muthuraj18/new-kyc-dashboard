import { useState } from 'react';

const MIN_REASON = 5;

// Confirmation dialog with a mandatory reason, used by Delete and Skip Payment Stage.
// onConfirm(reason) may throw; its message is shown and the dialog stays open.
export default function ReasonModal({ title, subtitle, children, confirmLabel, danger, acknowledge, onConfirm, onClose }) {
  const [reason, setReason] = useState('');
  const [acked, setAcked] = useState(!acknowledge);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const valid = reason.trim().length >= MIN_REASON && acked;

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await onConfirm(reason.trim());
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Action failed');
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={busy ? undefined : onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3 style={danger ? { color: 'var(--danger)' } : undefined}>{title}</h3>
        {subtitle && <p style={{ color: 'var(--muted)', marginTop: -8, fontSize: 13.5 }}>{subtitle}</p>}
        <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>{children}</div>

        <div className="form-field" style={{ marginTop: 16 }}>
          <label htmlFor="action-reason">Reason (required)</label>
          <textarea
            id="action-reason"
            className="reason-input"
            rows={3}
            maxLength={2000}
            value={reason}
            disabled={busy}
            placeholder={`At least ${MIN_REASON} characters`}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        {acknowledge && (
          <label className="ack-row">
            <input type="checkbox" checked={acked} disabled={busy} onChange={(e) => setAcked(e.target.checked)} />
            <span>{acknowledge}</span>
          </label>
        )}

        {error && <div className="form-error">{error}</div>}

        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose} disabled={busy}>Cancel</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} disabled={!valid || busy} onClick={submit}>
            {busy ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
