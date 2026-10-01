import { useEffect, useState } from 'react';
import api from '../api';
import Layout from '../components/Layout';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/audit-logs')
      .then(({ data }) => setLogs(data.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load audit logs'))
      .finally(() => setLoading(false));
  }, []);

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
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.created_at).toLocaleString()}</td>
                  <td>{log.actor || 'N/A'}</td>
                  <td>{log.action}</td>
                  <td>{log.target_table ? `${log.target_table} #${log.target_id}` : 'N/A'}</td>
                  <td style={{ maxWidth: 320, whiteSpace: 'normal' }}>
                    {log.details ? JSON.stringify(log.details) : 'N/A'}
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
