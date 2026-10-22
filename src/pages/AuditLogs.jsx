import { useEffect, useState } from 'react';
import api from '../api';
import Layout from '../components/Layout';

const PAGE_SIZE = 50;
const EMPTY_FILTERS = { search: '', from: '', to: '' };

// Admin audit log (Super Admin only). Append-only in the database.
// Search: unique ID, PAN, client code, username / email. Dates are inclusive (IST).
export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [exporting, setExporting] = useState(false);

  const params = () => {
    const p = { ...filters, search: filters.search.trim() };
    Object.keys(p).forEach((k) => { if (!p[k]) delete p[k]; });
    return p;
  };

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      setError('');
      api
        .get('/audit-logs', { params: { ...params(), page, pageSize: PAGE_SIZE } })
        .then(({ data }) => { setLogs(data.data); setTotal(data.total); })
        .catch((err) => setError(err.response?.data?.error || 'Failed to load audit logs'))
        .finally(() => setLoading(false));
    }, filters.search ? 350 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters]);

  const setFilter = (key) => (e) => {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: e.target.value }));
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await api.get('/audit-logs/export', { params: params(), responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Failed to export audit logs');
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const filtered = Boolean(filters.search.trim() || filters.from || filters.to);

  return (
    <Layout title="Audit Logs">
      <div className="filters-bar">
        <input
          className="search-input"
          type="text"
          placeholder="Search unique ID, PAN, client code, username..."
          value={filters.search}
          onChange={setFilter('search')}
        />
        <label className="date-filter">From <input type="date" value={filters.from} max={filters.to || undefined} onChange={setFilter('from')} /></label>
        <label className="date-filter">To <input type="date" value={filters.to} min={filters.from || undefined} onChange={setFilter('to')} /></label>
        {filtered && (
          <button className="btn btn-outline" onClick={() => { setPage(1); setFilters(EMPTY_FILTERS); }}>Clear</button>
        )}
        <button className="btn btn-primary" onClick={handleExport} disabled={exporting || total === 0} title="Download the matching entries as CSV">
          {exporting ? 'Exporting…' : <>Export &#8595;</>}
        </button>
      </div>

      <div className="table-card">
        {loading ? (
          <div className="state-msg">Loading audit logs...</div>
        ) : error ? (
          <div className="state-msg">{error}</div>
        ) : logs.length === 0 ? (
          <div className="state-msg">{filtered ? 'No entries match your search.' : 'No activity recorded yet.'}</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date &amp; Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target</th>
                <th>Client</th>
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
                  <td>
                    {log.client_unique_id || log.client_code || log.pan_number ? (
                      <>
                        {log.client_code || 'N/A'}
                        <div className="cell-sub">{[log.client_unique_id && `ID ${log.client_unique_id}`, log.pan_number].filter(Boolean).join(' · ')}</div>
                      </>
                    ) : 'N/A'}
                  </td>
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
