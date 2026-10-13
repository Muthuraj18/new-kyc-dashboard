import { useEffect, useState } from 'react';
import api from '../api';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ username: '', password: '', fullName: '', email: '', role: 'Admin' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [emailEdit, setEmailEdit] = useState(null); // { id, value, error }

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
      await api.post('/users', form);
      setForm({ username: '', password: '', fullName: '', email: '', role: 'Admin' });
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

  return (
    <Layout title="User Management">
      {isSuperAdmin && (
        <form className="filters-bar" onSubmit={handleCreate} style={{ alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Username</label>
            <input type="text" required value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Password</label>
            <input type="password" required value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Full Name</label>
            <input type="text" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Email</label>
            <input type="text" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Role</label>
            <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
              <option value="Admin">Admin</option>
              <option value="Super Admin">Super Admin</option>
            </select>
          </div>
          <button className="btn btn-primary" disabled={creating}>{creating ? 'Creating...' : 'Add User'}</button>
          {createError && <span style={{ color: 'var(--danger)', fontSize: 13 }}>{createError}</span>}
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
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
