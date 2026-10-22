import { useState } from 'react';
import { orNa } from '../utils/format';

export default function ClientEditModal({ record, readOnly, onClose, onSave }) {
  const [form, setForm] = useState({
    current_stage: record.current_stage || '',
    kyc_status: record.kyc_status || '',
    account_opening_status: record.account_opening_status || '',
  });
  const [saving, setSaving] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3>{readOnly ? 'Client Details' : 'Edit Client'}</h3>
        <p style={{ color: 'var(--muted)', marginTop: -8, fontSize: 13.5 }}>
          {orNa(record.client_name)} &middot; {orNa(record.client_code)} &middot; App #{orNa(record.application_id)}
        </p>

        <div className="modal-grid">
          <div className="modal-field">
            <label>Current Stage</label>
            <input disabled={readOnly} type="text" value={form.current_stage} onChange={update('current_stage')} />
          </div>
          <div className="modal-field">
            <label>KYC Status</label>
            <input disabled={readOnly} type="text" value={form.kyc_status} onChange={update('kyc_status')} />
          </div>
          {readOnly ? (
            // Calculated like the Status column: Yes only when the client is Completed (Re-KYC
            // match or TechExcel Success); Verify / In Progress clients show No. Display only.
            <div className="modal-field">
              <label>Account Opening Status</label>
              <input disabled type="text" value={record.rekyc_status === 'Completed' ? 'Yes' : 'No'} />
            </div>
          ) : (
            <div className="modal-field">
              <label>Account Opening Status (stored value)</label>
              <input type="text" value={form.account_opening_status} onChange={update('account_opening_status')} />
            </div>
          )}
        </div>

        <div className="modal-grid" style={{ marginTop: -6 }}>
          <div className="modal-field">
            <label>CVL KRA (read-only)</label>
            <input disabled type="text" value={orNa(record.cvlkra_push_status)} />
          </div>
          <div className="modal-field">
            <label>CDSL (read-only)</label>
            <input disabled type="text" value={orNa(record.cdsl_push_status)} />
          </div>
          <div className="modal-field">
            <label>NSE (read-only)</label>
            <input disabled type="text" value={orNa(record.nse_push_status)} />
          </div>
          <div className="modal-field">
            <label>BSE (read-only)</label>
            <input disabled type="text" value={orNa(record.bse_status)} />
          </div>
          <div className="modal-field">
            <label>TECHEXCEL (read-only)</label>
            <input disabled type="text" value={orNa(record.techexcel_push_status)} />
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>Close</button>
          {!readOnly && (
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
