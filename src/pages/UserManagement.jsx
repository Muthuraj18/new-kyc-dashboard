import { useEffect, useState } from 'react';
import api from '../api';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { MODULES, LEVELS } from '../utils/permissions';
import PasswordInput from '../components/PasswordInput';
import PasswordModal from '../components/PasswordModal';

const EMPTY_FORM = { username: '', password: '', fullName: '', email: '', role: 'Admin', permissions: {} };
const LEVEL_LABEL = { view: 'View', edit: 'Edit', delete: 'Delete' };

// One row per sidebar module, one checkbox per level (only the levels that module has).
// Ticking Edit / Delete also ticks View; unticking View clears the row.
function PermissionMatrix({ value, onChange, disabled }) {
  const toggle = (module, level) => {
    const current = new Set(value[module] || []);
    if (current.has(level)) {
      if (level === 'view') current.clear(); else current.delete(level);
    } else {
      current.add(level);
      current.add('view');
    }
    const next = { ...value };
    if (current.size) next[module] = LEVELS.filter((l) => current.has(l)); else delete next[module];
    onChange(next);
  };
  const setAll = (on) => onChange(on ? Object.fromEntries(MODULES.map((m) => [m.key, [...m.levels]])) : {});
  return (
    <div className="perm-matrix">
      <div className="perm-matrix-head">
        <strong>Agent access</strong>
        <span>
          <button type="button" className="link-btn" disabled={disabled} onClick={() => setAll(true)}>Tick all</button>
          {' · '}
          <button type="button" className="link-btn" disabled={disabled} onClick={() => setAll(false)}>Clear</button>
        </span>
      </div>
      <table className="data-table data-table--compact">
        <thead>
          <tr><th style={{ textAlign: 'left' }}>Module</th>{LEVELS.map((l) => <th key={l}>{LEVEL_LABEL[l]}</th>)}</tr>
        </thead>
        <tbody>
          {MODULES.map((m) => (
            <tr key={m.key}>
              <td style={{ textAlign: 'left' }}>{m.label}</td>
              {LEVELS.map((l) => (
                <td key={l}>
                  {m.levels.includes(l) ? (
                    <input
                      type="checkbox"
                      aria-label={`${m.label} ${LEVEL_LABEL[l]}`}
                      checked={(value[m.key] || []).includes(l)}
                      disabled={disabled}
                      onChange={() => toggle(m.key, l)}
                    />
                  ) : <span className="na">–</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const permissionSummary = (p) => {
  const keys = Object.keys(p || {});
  if (!keys.length) return 'No access';
  return keys.map((k) => {
    const label = MODULES.find((m) => m.key === k)?.label || k;
    const extra = (p[k] || []).filter((l) => l !== 'view');
    return extra.length ? `${label} (${extra.map((l) => LEVEL_LABEL[l]).join(', ')})` : label;
  }).join(', ');
};

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [emailEdit, setEmailEdit] = useState(null); // { id, value, error }
  const [accessEdit, setAccessEdit] = useState(null); // { id, username, role, permissions, saving, error }
  const [passwordReset, setPasswordReset] = useState(null); // { id, username, role }
  const [notice, setNotice] = useState('');

  const isSuperAdmin = currentUser?.role === 'Super Admin';

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const { data } = await api.get('/users');
      setUsers(data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      await api.post('/users', { ...form, permissions: form.role === 'Agent' ? form.permissions : undefined });
      setForm(EMPTY_FORM);
      loadUsers();
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  }

  // Email is stored as the "deleted by" email when this user deletes a client.
  async function saveEmail() {
    try {
      const { data } = await api.patch(`/users/${emailEdit.id}`, { email: emailEdit.value });
      setUsers((prev) => prev.map((u) => (u.id === data.data.id ? data.data : u)));
      setEmailEdit(null);
    } catch (err) {
      setEmailEdit((e) => ({ ...e, error: err.response?.data?.error || 'Failed to save email' }));
    }
  }

  async function saveAccess() {
    setAccessEdit((a) => ({ ...a, saving: true, error: '' }));
    try {
      const { data } = await api.patch(`/users/${accessEdit.id}`, {
        role: accessEdit.role,
        ...(accessEdit.role === 'Agent' ? { permissions: accessEdit.permissions } : {}),
      });
      setUsers((prev) => prev.map((u) => (u.id === data.data.id ? data.data : u)));
      setAccessEdit(null);
    } catch (err) {
      setAccessEdit((a) => ({ ...a, saving: false, error: err.response?.data?.error || 'Failed to save access' }));
    }
  }

  const field = (label, input) => (
    <div className="um-field">
      <label>{label}</label>
      {input}
    </div>
  );

  return (
    <Layout title="User Management">
      {isSuperAdmin && (
        <form className="table-card um-form" onSubmit={handleCreate}>
          <div className="um-row">
            {field('Username', <input className="field-input" type="text" required value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />)}
            {field('Password', <PasswordInput value={form.password} onChange={(password) => setForm((f) => ({ ...f, password }))} disabled={creating} />)}
            {field('Full Name', <input className="field-input" type="text" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />)}
            {field('Email', <input className="field-input" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />)}
            {field('Role', (
              <select className="field-input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                <option value="Admin">Admin</option>
                <option value="Super Admin">Super Admin</option>
                <option value="Agent">Agent (choose modules)</option>
              </select>
            ))}
            <button className="btn btn-primary" disabled={creating}>{creating ? 'Creating...' : 'Add User'}</button>
          </div>
          <div className="um-hint">Password: at least 8 characters.</div>
          {form.role === 'Agent' && (
            <PermissionMatrix value={form.permissions} onChange={(permissions) => setForm((f) => ({ ...f, permissions }))} disabled={creating} />
          )}
          {createError && <div className="form-error" style={{ marginTop: 8 }}>{createError}</div>}
        </form>
      )}

      <div className="table-card">
        {loading ? (
          <div className="state-msg">Loading users...</div>
        ) : error ? (
          <div className="state-msg">{error}</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Access</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.username}</td>
                  <td>{u.full_name || 'N/A'}</td>
                  <td>
                    {emailEdit?.id === u.id ? (
                      <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        <input
                          type="text"
                          className="inline-input"
                          value={emailEdit.value}
                          autoFocus
                          onChange={(e) => setEmailEdit({ ...emailEdit, value: e.target.value, error: '' })}
                        />
                        <button className="btn btn-primary btn-sm" onClick={saveEmail}>Save</button>
                        <button className="btn btn-outline btn-sm" onClick={() => setEmailEdit(null)}>Cancel</button>
                        {emailEdit.error && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{emailEdit.error}</span>}
                      </span>
                    ) : (
                      <>
                        {u.email || <span className="na">N/A</span>}
                        {isSuperAdmin && (
                          <button className="link-btn" style={{ marginLeft: 8 }} onClick={() => setEmailEdit({ id: u.id, value: u.email || '' })}>
                            Edit
                          </button>
                        )}
                      </>
                    )}
                  </td>
                  <td>{u.role}</td>
                  <td style={{ maxWidth: 320, whiteSpace: 'normal' }}>
                    {u.role === 'Agent' ? permissionSummary(u.permissions) : 'All modules (by role)'}
                    {isSuperAdmin && u.id !== currentUser?.id && (
                      <button
                        className="link-btn"
                        style={{ marginLeft: 8 }}
                        onClick={() => setAccessEdit({ id: u.id, username: u.username, role: u.role, permissions: u.permissions || {} })}
                      >
                        Edit access
                      </button>
                    )}
                  </td>
                  <td>
                    {new Date(u.created_at).toLocaleDateString()}
                    {isSuperAdmin && (
                      <button className="link-btn" style={{ marginLeft: 8 }} onClick={() => setPasswordReset({ id: u.id, username: u.username, role: u.role })}>
                        Reset password
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {notice && <div className="table-notice">{notice}</div>}

      {passwordReset && (
        <PasswordModal
          mode="reset"
          target={passwordReset}
          onClose={() => setPasswordReset(null)}
          onDone={() => { setNotice(`Password reset for ${passwordReset.username}.`); setTimeout(() => setNotice(''), 6000); }}
        />
      )}

      {accessEdit && (
        <div className="modal-backdrop" onClick={accessEdit.saving ? undefined : () => setAccessEdit(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <h3>Access · {accessEdit.username}</h3>
            <div className="um-field" style={{ marginBottom: 12 }}>
              <label>Role</label>
              <select className="field-input" value={accessEdit.role} disabled={accessEdit.saving} onChange={(e) => setAccessEdit((a) => ({ ...a, role: e.target.value }))}>
                <option value="Admin">Admin</option>
                <option value="Super Admin">Super Admin</option>
                <option value="Agent">Agent (choose modules)</option>
              </select>
            </div>
            {accessEdit.role === 'Agent' && (
              <PermissionMatrix value={accessEdit.permissions} onChange={(permissions) => setAccessEdit((a) => ({ ...a, permissions }))} disabled={accessEdit.saving} />
            )}
            <p className="um-hint">Changes apply to an Agent right away; the menu updates at their next login or page reload.</p>
            {accessEdit.error && <div className="form-error">{accessEdit.error}</div>}
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setAccessEdit(null)} disabled={accessEdit.saving}>Cancel</button>
              <button className="btn btn-primary" onClick={saveAccess} disabled={accessEdit.saving}>{accessEdit.saving ? 'Saving…' : 'Save access'}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
