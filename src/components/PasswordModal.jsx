import { useState } from 'react';
import api from '../api';
import PasswordInput from './PasswordInput';

const MIN = 8;

// mode 'self': the signed-in user sets a new password for their own login.
// mode 'reset': a Super Admin sets a new password for `target` ({ id, username, role }).
export default function PasswordModal({ mode, target, onClose, onDone }) {
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (next.length < MIN) { setError(`The new password must be at least ${MIN} characters.`); return; }
    if (next !== confirm) { setError('The two new passwords do not match.'); return; }
    setSaving(true);
    try {
      if (mode === 'self') await api.post('/users/me/password', { newPassword: next });
      else await api.post(`/users/${target.id}/password`, { password: next });
      onDone?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save the password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={saving ? undefined : onClose}>
      <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={submit} style={{ maxWidth: 440 }}>
        <h3>{mode === 'self' ? 'Change my password' : `Reset password · ${target.username}`}</h3>
        {mode === 'reset' && (
          <p className="um-hint" style={{ marginTop: 0 }}>
            Sets a new password for this {target.role}. Share it with them securely; they can change it from the top bar after signing in.
          </p>
        )}
        <div className="um-field" style={{ marginBottom: 10 }}>
          <label htmlFor="pw-new">New password (at least {MIN} characters)</label>
          <PasswordInput id="pw-new" value={next} onChange={setNext} disabled={saving} autoFocus />
        </div>
        <div className="um-field" style={{ marginBottom: 10 }}>
          <label htmlFor="pw-confirm">Confirm new password</label>
          <PasswordInput id="pw-confirm" value={confirm} onChange={setConfirm} disabled={saving} />
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : mode === 'self' ? 'Change password' : 'Reset password'}</button>
        </div>
      </form>
    </div>
  );
}
