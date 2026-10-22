import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { can } from '../utils/permissions';

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

// All clients, paginated on the server (the list grows every day).
const LOG_MODULES = [
  { key: 'mobile_otp', label: 'Mobile OTP' },
  { key: 'email_otp', label: 'Email OTP' },
  { key: 'pan', label: 'PAN' },
  { key: 'personal', label: 'Personal Details' },
  { key: 'nominee', label: 'Nominee' },
  { key: 'signature', label: 'Signature' },
  { key: 'bank', label: 'Bank' },
  { key: 'penny_drop', label: 'Penny Drop' },
  { key: 'ipv', label: 'IPV / Live Photo' },
  { key: 'esign', label: 'eSign' },
];
const EMPTY_FILTERS = { kycType: '', dashboardStatus: '', stage: '', dateFrom: '', dateTo: '' };

// Server-side export of ALL matching clients' logs (the file is built by the backend).
function ExportPanel({ filters }) {
  const [modules, setModules] = useState(LOG_MODULES.map((m) => m.key));
  const [eventFrom, setEventFrom] = useState('');
  const [eventTo, setEventTo] = useState('');
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [format, setFormat] = useState('xlsx');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const toggle = (k) => setModules((m) => (m.includes(k) ? m.filter((x) => x !== k) : [...m, k]));
  const run = async () => {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const clean = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const { data } = await api.post('/kyc-logs/export', {
        filters: clean, modules, eventFrom: eventFrom || undefined, eventTo: eventTo || undefined, onlyIssues, format,
      });
      setResult(data.data);
      if (data.data.rows > 0) {
        const a = document.createElement('a');
        a.href = data.data.url;
        a.download = data.data.fileName;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Export failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="table-card export-panel">
      <div className="export-head">
        <strong>Download All Logs</strong>
        <span>Every client matching the filters above, not just this page. Built on the server.</span>
      </div>
      <div className="export-modules">
        {LOG_MODULES.map((m) => (
          <label key={m.key} className="ack-row" style={{ margin: 0 }}>
            <input type="checkbox" checked={modules.includes(m.key)} onChange={() => toggle(m.key)} disabled={busy} />
            <span>{m.label}</span>
          </label>
        ))}
        <button type="button" className="link-btn" onClick={() => setModules(modules.length === LOG_MODULES.length ? [] : LOG_MODULES.map((m) => m.key))}>
          {modules.length === LOG_MODULES.length ? 'Clear all' : 'Select all'}
        </button>
      </div>
      <div className="export-options">
        <label>Log date from <input type="date" value={eventFrom} onChange={(e) => setEventFrom(e.target.value)} disabled={busy} /></label>
        <label>to <input type="date" value={eventTo} onChange={(e) => setEventTo(e.target.value)} disabled={busy} /></label>
        <label className="ack-row" style={{ margin: 0 }}>
          <input type="checkbox" checked={onlyIssues} onChange={(e) => setOnlyIssues(e.target.checked)} disabled={busy} />
          <span>Errors / failures only</span>
        </label>
        <select value={format} onChange={(e) => setFormat(e.target.value)} disabled={busy} aria-label="Format">
          <option value="xlsx">Excel (.xlsx)</option>
          <option value="csv">CSV</option>
        </select>
        <button className="btn btn-primary btn-sm" onClick={run} disabled={busy || !modules.length}>
          {busy ? 'Preparing file…' : 'Download All Logs'}
        </button>
      </div>
      {error && <div className="form-error" style={{ marginTop: 10, marginBottom: 0 }}>{error}</div>}
      {result && (
        <div className="export-result">
          {result.rows === 0
            ? 'No logs available for the selected filters.'
            : <>Exported {result.rows.toLocaleString()} log rows for {result.clients.toLocaleString()} clients ({(result.sizeBytes / 1024).toFixed(0)} KB). If the download didn&apos;t start, <a href={result.url} download={result.fileName}>click here</a> (link valid 15 minutes).</>}
        </div>
      )}
    </div>
  );
}

function ClientPicker({ onPick }) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [stages, setStages] = useState([]);
  useEffect(() => {
    api.get('/kyc-logs/stages').then(({ data }) => setStages(data.data || [])).catch(() => {});
  }, []);
  const setFilter = (k) => (e) => { setPage(1); setFilters((f) => ({ ...f, [k]: e.target.value })); };
  const activeCount = Object.values(filters).filter(Boolean).length;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [result, setResult] = useState(null); // { rows, total, page, pageSize, totalPages }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const rows = result?.rows;

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      setError('');
      const params = { search: search || undefined, page, pageSize };
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      api.get('/kyc-logs/clients', { params })
        // Older backends returned a plain array (first 20 only); accept both shapes.
        .then(({ data }) => setResult(Array.isArray(data.data)
          ? { rows: data.data, total: data.data.length, page: 1, pageSize: data.data.length || 25, totalPages: 1 }
          : data.data))
        .catch((err) => setError(err.response?.data?.error || 'Failed to search clients'))
        .finally(() => setLoading(false));
    }, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [search, filters, page, pageSize]);

  const from = result && result.total ? (result.page - 1) * result.pageSize + 1 : 0;
  const to = result ? Math.min(result.page * result.pageSize, result.total) : 0;

  return (
    <>
      <div className="filters-bar">
        <input
          type="text"
          placeholder="Search unique ID, client code, PAN, name, mobile, email…"
          value={search}
          onChange={(e) => { setPage(1); setSearch(e.target.value); }}
          style={{ flex: 1, minWidth: 260 }}
          autoFocus
        />
      </div>
      <div className="filters-bar custom-filters">
        <strong className="custom-filters-title">Custom data{activeCount ? ` (${activeCount})` : ''}</strong>
        <select value={filters.kycType} onChange={setFilter('kycType')} aria-label="KYC type">
          <option value="">All KYC Types</option>
          <option value="PRE KYC">PRE KYC</option>
          <option value="KYC">KYC</option>
        </select>
        <select value={filters.dashboardStatus} onChange={setFilter('dashboardStatus')} aria-label="Status">
          <option value="">All Clients</option>
          <option value="verify">Verify</option>
          <option value="in_progress">In Progress</option>
        </select>
        <select value={filters.stage} onChange={setFilter('stage')} aria-label="Stage">
          <option value="">All Stages</option>
          {stages.map((st) => <option key={st.stage} value={st.stage}>{st.stage} ({st.clients})</option>)}
        </select>
        <label className="date-filter">Applied from <input type="date" value={filters.dateFrom} onChange={setFilter('dateFrom')} /></label>
        <label className="date-filter">to <input type="date" value={filters.dateTo} onChange={setFilter('dateTo')} /></label>
        {activeCount > 0 && (
          <button type="button" className="btn btn-outline btn-sm" onClick={() => { setPage(1); setFilters(EMPTY_FILTERS); }}>Clear</button>
        )}
      </div>
      <ExportPanel filters={{ ...filters, search }} />
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
        {result && result.total > 0 && (
          <div className="pagination">
            <span>
              Showing {from}–{to} of {result.total} client{result.total === 1 ? '' : 's'}
              {loading ? ' · loading…' : ''}
            </span>
            <div className="pagination-controls">
              <select
                value={pageSize}
                onChange={(e) => { setPage(1); setPageSize(Number(e.target.value)); }}
                aria-label="Rows per page"
              >
                {[25, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
              </select>
              <button className="btn btn-outline btn-sm" disabled={page <= 1 || loading} onClick={() => setPage(1)}>First</button>
              <button className="btn btn-outline btn-sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <span className="page-gap">Page {result.page} of {result.totalPages}</span>
              <button className="btn btn-outline btn-sm" disabled={page >= result.totalPages || loading} onClick={() => setPage((p) => p + 1)}>Next</button>
              <button className="btn btn-outline btn-sm" disabled={page >= result.totalPages || loading} onClick={() => setPage(result.totalPages)}>Last</button>
            </div>
          </div>
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

  if (!can(user, 'kyc_logs')) {
    return <Layout title="KYC Logs"><div className="table-card state-msg">Only an Admin or Super Admin can view KYC logs.</div></Layout>;
  }
  return (
    <Layout title="KYC Logs">
      {id && <div className="detail-back"><Link to="/kyc-logs">&larr; Choose another client</Link></div>}
      {id ? <ClientLogsView id={id} /> : <ClientPicker onPick={(cid) => navigate(`/kyc-logs/${cid}`)} />}
    </Layout>
  );
}
