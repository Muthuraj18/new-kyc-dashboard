import { useState } from 'react';

const MIN_REASON = 5;
const OTHER = 'Other';

// Confirmation dialog with a mandatory reason, used by Delete and Skip Payment Stage.
// details: [{ label, value }] shown in a box so the admin can verify the client.
// reasonOptions: optional list of common reasons; picking one is required, details are
//   optional except for "Other". The reason sent is "<option>: <details>".
// onConfirm(reason) may throw; its message is shown and the dialog stays open.
export default function ReasonModal({
  title, subtitle, details, reasonOptions, reasonLabel, children, confirmLabel, danger, acknowledge, onConfirm, onClose,
}) {
  const [option, setOption] = useState('');
  const [text, setText] = useState('');
  const [acked, setAcked] = useState(!acknowledge);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const notes = text.trim();
  const textRequired = !reasonOptions || option === OTHER;
  const reason = reasonOptions
    ? (option === OTHER ? notes : [option, notes].filter(Boolean).join(': '))
    : notes;
  const valid = acked
    && (!reasonOptions || !!option)
    && (!textRequired || notes.length >= MIN_REASON);

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await onConfirm(reason);
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
        {details && (
          <dl className={`verify-box${danger ? ' verify-box--danger' : ''}`}>
            {details.map((d) => (
              <div key={d.label}>
                <dt>{d.label}</dt>
                <dd className="mono">{d.value || <span className="na">N/A</span>}</dd>
              </div>
            ))}
          </dl>
        )}
        <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>{children}</div>

        {reasonOptions && (
          <div className="form-field" style={{ marginTop: 16, marginBottom: 10 }}>
            <label htmlFor="action-reason-option">{reasonLabel || 'Reason'} (required)</label>
            <select
              id="action-reason-option"
              className="reason-input"
              value={option}
              disabled={busy}
              onChange={(e) => setOption(e.target.value)}
            >
              <option value="">Select a reason...</option>
              {reasonOptions.map((o) => <option key={o} value={o}>{o}</option>)}
              <option value={OTHER}>{OTHER}</option>
            </select>
          </div>
        )}

        <div className="form-field" style={reasonOptions ? undefined : { marginTop: 16 }}>
          <label htmlFor="action-reason">
            {reasonOptions ? `Details ${textRequired ? '(required)' : '(optional)'}` : 'Reason (required)'}
          </label>
          <textarea
            id="action-reason"
            className="reason-input"
            rows={3}
            maxLength={2000}
            value={text}
            disabled={busy}
            placeholder={textRequired ? `At least ${MIN_REASON} characters` : 'e.g. reference number, approver name'}
            onChange={(e) => setText(e.target.value)}
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
