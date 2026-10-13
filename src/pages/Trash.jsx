import { useEffect, useState } from 'react';
import api from '../api';
import Layout from '../components/Layout';
import { orNa } from '../utils/format';

const PAGE_SIZE = 25;
const formatDateTime = (v) => (v ? new Date(v).toLocaleString() : 'N/A');

// Permanent archive of deleted clients (Super Admin only). Read-only: records are
// append-only in the database and cannot be changed or removed.
export default function Trash() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get('/trash', { params: { page, pageSize: PAGE_SIZE, search: search || undefined } });
        setRows(data.data);
        setTotal(data.total);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load trash');
      } finally {
        setLoading(false);
      }
    }, search ? 350 : 0);
    return () => clearTimeout(timeout);
  }, [page, search]);

  const openDetail = async (r) => {
    setDetail({ record: r, snapshot: null });
    try {
      const { data } = await api.get(`/trash/${r.id}`);
      setDetail({ record: data.data, snapshot: data.data.snapshot });
    } catch (err) {
      setDetail({ record: r, error: err.response?.data?.error || 'Failed to load snapshot' });
    }
  };

  const downloadSnapshot = () => {
    const blob = new Blob([JSON.stringify(detail.record, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deleted-client-${detail.record.unique_id || detail.record.kyc_master_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <Layout title="Trash">
      <div className="filters-bar">
        <input
          type="text"
          placeholder="Search App ID, client, PAN, mobile, deleted by, reason..."
          value={search}
          onChange={(e) => { setPage(1); setSearch(e.target.value); }}
          style={{ flex: 1, minWidth: 240 }}
        />
      </div>

      <div className="table-card">
        {loading ? (
          <div className="state-msg">Loading trash...</div>
        ) : error ? (
          <div className="state-msg">{error}</div>
        ) : rows.length === 0 ? (
          <div className="state-msg">No deleted clients.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Deleted At</th>
                <th>App ID</th>
                <th>Client Code</th>
                <th>Client Name</th>
                <th>PAN Number</th>
                <th>Mobile</th>
                <th>Stage</th>
                <th>Deleted By</th>
                <th>Reason</th>
                <th>Snapshot</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{formatDateTime(r.deleted_at)}</td>
                  <td>{orNa(r.unique_id)}</td>
                  <td>{orNa(r.client_code)}</td>
                  <td>{orNa(r.client_name)}</td>
                  <td>{orNa(r.pan_number)}</td>
                  <td>{orNa(r.mobile_number)}</td>
                  <td>{orNa(r.current_stage)}</td>
                  <td>
                    {r.deleted_by_name || r.deleted_by}
                    <div className="cell-sub">{r.deleted_by_email || r.deleted_by_role}</div>
                  </td>
                  <td style={{ maxWidth: 260, whiteSpace: 'normal' }}>{r.reason}</td>
                  <td>
                    <button className="btn btn-outline btn-sm" onClick={() => openDetail(r)}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && !error && total > PAGE_SIZE && (
          <div className="pagination">
            <span>Page {page} of {totalPages} · {total} records</span>
            <div className="pagination-controls">
              <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>

      {detail && (
        <div className="modal-backdrop" onClick={() => setDetail(null)}>
          <div className="modal-card snapshot-card" onClick={(e) => e.stopPropagation()}>
            <h3>Deleted client snapshot</h3>
            <p style={{ color: 'var(--muted)', marginTop: -8, fontSize: 13.5 }}>
              {orNa(detail.record.client_name)} · App #{orNa(detail.record.unique_id)}
            </p>
            <dl className="snapshot-meta">
              <dt>Deleted by</dt>
              <dd>
                {detail.record.deleted_by_name || detail.record.deleted_by} ({detail.record.deleted_by_role})
                {detail.record.deleted_by_email ? ` · ${detail.record.deleted_by_email}` : ''}
              </dd>
              <dt>Deleted at</dt>
              <dd>{formatDateTime(detail.record.deleted_at)}</dd>
              <dt>Reason</dt>
              <dd>{detail.record.reason}</dd>
            </dl>

            {detail.error ? (
              <div className="form-error">{detail.error}</div>
            ) : !detail.snapshot ? (
              <div className="state-msg">Loading snapshot...</div>
            ) : (
              <>
                <details open>
                  <summary>Client record (kyc_master_details)</summary>
                  <pre className="snapshot-json">{JSON.stringify(detail.snapshot.kyc_master_details, null, 2)}</pre>
                </details>
                {Object.entries(detail.snapshot.related || {}).map(([table, list]) => (
                  <details key={table}>
                    <summary>{table} ({list.length})</summary>
                    <pre className="snapshot-json">{JSON.stringify(list, null, 2)}</pre>
                  </details>
                ))}
                {detail.snapshot.master_data && (
                  <details>
                    <summary>BOID / stamp paper (master_data)</summary>
                    <pre className="snapshot-json">{JSON.stringify(detail.snapshot.master_data, null, 2)}</pre>
                  </details>
                )}
              </>
            )}

            <div className="modal-actions" style={{ marginTop: 16 }}>
              {detail.snapshot && <button className="btn btn-outline" onClick={downloadSnapshot}>Download JSON</button>}
              <button className="btn btn-primary" onClick={() => setDetail(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
