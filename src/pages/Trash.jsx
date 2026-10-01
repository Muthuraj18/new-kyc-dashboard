import { useEffect, useState } from 'react';
import api from '../api';
import Layout from '../components/Layout';
import { formatDate, orNa } from '../utils/format';

export default function Trash() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTrash();
  }, []);

  async function loadTrash() {
    setLoading(true);
    try {
      const { data } = await api.get('/clients/trash');
      setRows(data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load trash');
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore(record) {
    await api.post(`/clients/${record.id}/restore`);
    setRows((prev) => prev.filter((r) => r.id !== record.id));
  }

  return (
    <Layout title="Trash">
      <div className="table-card">
        {loading ? (
          <div className="state-msg">Loading trash...</div>
        ) : error ? (
          <div className="state-msg">{error}</div>
        ) : rows.length === 0 ? (
          <div className="state-msg">Trash is empty.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Application Date</th>
                <th>Client Code</th>
                <th>Client Name</th>
                <th>PAN Number</th>
                <th>Email ID</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{formatDate(r.created_at)}</td>
                  <td>{orNa(r.client_code)}</td>
                  <td>{orNa(r.client_name)}</td>
                  <td>{orNa(r.pan_number)}</td>
                  <td>{orNa(r.email)}</td>
                  <td>
                    <button className="btn btn-outline btn-sm" onClick={() => handleRestore(r)}>
                      Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
