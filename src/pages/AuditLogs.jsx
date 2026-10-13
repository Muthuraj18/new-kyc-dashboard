import { useEffect, useState } from 'react';
import api from '../api';
import Layout from '../components/Layout';

const PAGE_SIZE = 50;

// Admin audit log (Super Admin only). Append-only in the database.
export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api
      .get('/audit-logs', { params: { page, pageSize: PAGE_SIZE } })
      .then(({ data }) => { setLogs(data.data); setTotal(data.total); })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load audit logs'))
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <Layout title="Audit Logs">
      <div className="table-card">
        {loading ? (
          <div className="state-msg">Loading audit logs...</div>
        ) : error ? (
          <div className="state-msg">{error}</div>
        ) : logs.length === 0 ? (
          <div className="state-msg">No activity recorded yet.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target</th>
                <th>Reason</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.created_at).toLocaleString()}</td>
                  <td>
                    {log.actor || 'N/A'}
                    {(log.actor_role || log.actor_email) && (
                      <div className="cell-sub">{[log.actor_role, log.actor_email].filter(Boolean).join(' · ')}</div>
                    )}
                  </td>
                  <td>{log.action}</td>
                  <td>{log.target_table ? `${log.target_table} #${log.target_id}` : 'N/A'}</td>
                  <td style={{ maxWidth: 240, whiteSpace: 'normal' }}>{log.reason || 'N/A'}</td>
                  <td style={{ maxWidth: 360, whiteSpace: 'normal' }} className="mono">
                    {log.details ? JSON.stringify(log.details) : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && !error && total > PAGE_SIZE && (
          <div className="pagination">
            <span>Page {page} of {totalPages} · {total} entries</span>
            <div className="pagination-controls">
              <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
