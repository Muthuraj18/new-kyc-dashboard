import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

const ROLES = ['Super Admin', 'Admin'];
const fmt = (v) => (v ? new Date(v).toLocaleString() : 'Time not recorded');
const STATUS_CLASS = (s) => (/error|fail|reject|not verified|mismatch/i.test(s || '') ? 'pill-no'
  : /ok|success|verified|completed|sent|captured|stored|done|uploaded/i.test(s || '') ? 'pill-completed' : 'pill-pending');

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
function downloadCsv(name, client, modules) {
  const header = ['Unique ID', 'Client Code', 'PAN', 'Module', 'Time', 'Stage / Action', 'Status', 'Source', 'Remarks / Error', 'Details'];
  const lines = [header.join(',')];
  modules.forEach((m) => m.events.forEach((e) => lines.push([
    client.unique_id, client.client_code, client.pan_number, m.label, e.time || '', e.stage, e.status, e.source,
    e.remarks, e.details ? JSON.stringify(e.details) : '',
  ].map(csvCell).join(','))));
  if (lines.length === 1) lines.push(csvCell('No logs available'));
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function ClientPicker({ onPick }) {
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const t = setTimeout(() => {
      api.get('/kyc-logs/clients', { params: { search: search || undefined } })
        .then(({ data }) => setRows(data.data))
        .catch((err) => setError(err.response?.data?.error || 'Failed to search clients'));
    }, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <>
      <div className="filters-bar">
        <input
          type="text"
          placeholder="Search unique ID, client code, PAN, name, mobile, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 260 }}
          autoFocus
        />
      </div>
      <div className="table-card">
        {error ? <div className="state-msg">{error}</div> : !rows ? <div className="state-msg">Loading…</div> : !rows.length ? (
          <div className="state-msg">No clients found.</div>
        ) : (
          <table className="data-table data-table--compact">
            <thead>
              <tr><th>Unique ID</th><th>Client Code</th><th>Name</th><th>PAN</th><th>KYC Type</th><th>Stage</th><th /></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="clickable-row" onClick={() => onPick(r.id)}>
                  <td className="mono">{r.unique_id}</td>
                  <td>{r.client_code || 'N/A'}</td>
                  <td>{r.name || 'N/A'}</td>
                  <td className="mono">{r.pan_number || 'N/A'}</td>
                  <td>{r.kyc_type || 'N/A'}</td>
                  <td>{r.current_stage || 'N/A'}</td>
                  <td><button className="btn btn-outline btn-sm">View logs</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function ClientLogsView({ id }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState({});

  const load = () => {
    setLoading(true);
    setError('');
    api.get(`/kyc-logs/${id}`)
      .then(({ data: res }) => {
        setData(res.data);
        setOpen(Object.fromEntries(res.data.modules.map((m) => [m.key, m.events.length > 0])));
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load logs'))
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [id]);

  if (loading && !data) return <div className="table-card state-msg">Loading logs (database + CloudWatch)… this can take up to 20 seconds.</div>;
  if (error) return <div className="table-card state-msg">{error}</div>;
  const c = data.client;
  const total = data.modules.reduce((n, m) => n + m.events.length, 0);
  const cwMsg = data.cloudwatch.error
    ? `CloudWatch: ${data.cloudwatch.error}`
    : data.cloudwatch.queried
      ? `CloudWatch: ${data.cloudwatch.matched} matching line(s) since ${new Date(data.cloudwatch.from).toLocaleDateString()}`
      : `CloudWatch not searched${data.cloudwatch.reason ? ` (${data.cloudwatch.reason})` : ''}`;

  return (
    <>
      <div className="logs-header table-card">
        <div className="detail-summary">
          <div><span>Unique ID</span><strong>{c.unique_id}</strong></div>
          <div><span>Client Code</span><strong>{c.client_code || 'N/A'}</strong></div>
          <div><span>PAN</span><strong>{c.pan_number || 'N/A'}</strong></div>
          <div><span>Name</span><strong>{c.name || 'N/A'}</strong></div>
          <div><span>KYC Type</span><strong>{c.kyc_type || 'N/A'}</strong></div>
          <div><span>Stage</span><strong>{c.current_stage || 'N/A'}</strong></div>
        </div>
        <div className="logs-header-actions">
          <span className={`logs-cw${data.cloudwatch.error ? ' logs-cw--warn' : ''}`}>{cwMsg}</span>
          <button className="btn btn-outline btn-sm" onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>
          <button className="btn btn-primary btn-sm" onClick={() => downloadCsv(`kyc-logs-${c.unique_id}-all.csv`, c, data.modules)}>
            Download All Logs ({total})
          </button>
        </div>
      </div>

      {data.modules.map((m) => (
        <section key={m.key} className="logs-module table-card">
          <div className="logs-module-head">
            <button className="logs-module-toggle" onClick={() => setOpen((o) => ({ ...o, [m.key]: !o[m.key] }))} aria-expanded={!!open[m.key]}>
              <span className={`nav-caret-inline${open[m.key] ? ' open' : ''}`}>▸</span>
              {m.label}
              <span className="logs-count">{m.events.length}</span>
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => downloadCsv(`kyc-logs-${c.unique_id}-${m.key}.csv`, c, [m])}
              disabled={!m.events.length}
            >
              Download Logs
            </button>
          </div>
          {open[m.key] && (m.events.length === 0 ? (
            <div className="state-msg" style={{ padding: 18 }}>No logs available</div>
          ) : (
            <table className="data-table data-table--compact logs-table">
              <thead>
                <tr><th>Time</th><th>Stage / Action</th><th>Status</th><th>Source</th><th>Remarks / Error</th><th>Details</th></tr>
              </thead>
              <tbody>
                {m.events.map((e, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <tr key={i}>
                    <td className={e.time ? '' : 'na'}>{fmt(e.time)}</td>
                    <td>{e.stage}</td>
                    <td>{e.status ? <span className={`pill ${STATUS_CLASS(e.status)}`}>{e.status}</span> : <span className="na">N/A</span>}</td>
                    <td>{e.source}</td>
                    <td className="logs-text">{e.remarks || <span className="na">—</span>}</td>
                    <td className="logs-text">
                      {e.details ? (
                        <details>
                          <summary>{Object.keys(e.details).length} field(s)</summary>
                          <pre>{JSON.stringify(e.details, null, 2)}</pre>
                        </details>
                      ) : <span className="na">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
        </section>
      ))}
    </>
  );
}

export default function KycLogs() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!ROLES.includes(user?.role)) {
    return <Layout title="KYC Logs"><div className="table-card state-msg">Only an Admin or Super Admin can view KYC logs.</div></Layout>;
  }
  return (
    <Layout title="KYC Logs">
      {id && <div className="detail-back"><Link to="/kyc-logs">&larr; Choose another client</Link></div>}
      {id ? <ClientLogsView id={id} /> : <ClientPicker onPick={(cid) => navigate(`/kyc-logs/${cid}`)} />}
    </Layout>
  );
}
