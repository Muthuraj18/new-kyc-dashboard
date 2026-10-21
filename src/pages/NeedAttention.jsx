import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Layout from '../components/Layout';
import CopyableCell from '../components/CopyableCell';
import { useAuth } from '../context/AuthContext';

const VIEW_ROLES = ['Super Admin', 'Admin'];
const fmtDate = (v) => (v ? new Date(v).toLocaleString() : 'N/A');

// CSV of the rows on screen (module / search / date filters applied). UTF-8 BOM so Excel
// opens names and reasons correctly; values that could start a formula are prefixed.
const csvCell = (v) => {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
function exportCsv(rows) {
  const header = ['Unique ID', 'Client Code', 'PAN', 'Client Name', 'Rejected Module', 'Current Status', 'Error / Rejection Reason', 'Last Updated', 'Agency Response'];
  const lines = rows.map((r) => [
    r.unique_id, r.client_code, r.pan, r.client_name, r.module_label, r.status, r.reason,
    r.updated_at ? new Date(r.updated_at).toLocaleString() : '', r.response,
  ].map(csvCell).join(','));
  const blob = new Blob([String.fromCharCode(0xfeff) + [header.join(','), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `need-attention-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
// Local calendar day (YYYY-MM-DD) of a timestamp, matching the date shown in Last Updated.
const localDay = (v) => {
  const d = new Date(v);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
// From / To are inclusive; either may be empty. Rows without a time only show with no range.
const inDateRange = (v, from, to) => {
  if (!from && !to) return true;
  if (!v) return false;
  const day = localDay(v);
  return (!from || day >= from) && (!to || day <= to);
};

// Need Attention: integration records (CVLKRA / CDSL / NSE / BSE / TECHEXCEL) whose push
// status is Rejected / Failed / Error, read live on every load. One row per rejected
// module; clicking it opens that client's record in Tables -> <module>. A record drops off
// as soon as its status is no longer rejected (e.g. after an edit resets it to Pending) or
// the client's Status becomes Completed (Re-KYC match, checked by the backend).
export default function NeedAttention() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [module, setModule] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reload, setReload] = useState(0);
  const [shownResponse, setShownResponse] = useState(null); // "<module>-<unique_id>" whose full response is open
  const allowed = VIEW_ROLES.includes(user?.role);

  useEffect(() => {
    if (!allowed) return;
    setError('');
    api.get('/need-attention')
      .then(({ data: res }) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load Need Attention'));
  }, [allowed, reload]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.rows || []).filter((r) => (!module || r.module === module)
      && (!term || [r.unique_id, r.client_code, r.pan, r.client_name, r.reason]
        .some((v) => String(v || '').toLowerCase().includes(term)))
      && inDateRange(r.updated_at, dateFrom, dateTo));
  }, [data, module, search, dateFrom, dateTo]);

  const open = (r) => navigate(`/tables/${r.module}?open=${encodeURIComponent(r.unique_id)}`);

  if (!allowed) {
    return <Layout title="Need Attention"><div className="table-card state-msg">Only an Admin or Super Admin can view Need Attention.</div></Layout>;
  }

  return (
    <Layout title="Need Attention">
      <div className="filters-bar">
        <select value={module} onChange={(e) => setModule(e.target.value)} aria-label="Module">
          <option value="">All modules{data ? ` (${data.rows.length})` : ''}</option>
          {(data?.modules || []).map((m) => (
            <option key={m.key} value={m.key}>{m.label}{data.counts[m.key] === null ? ' (unavailable)' : ` (${data.counts[m.key]})`}</option>
          ))}
        </select>
        <input
          type="text"
          className="search-input"
          placeholder="Search unique ID, client code, PAN, name, reason…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="date-filter">From <input type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} /></label>
        <label className="date-filter">To <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} /></label>
        {(dateFrom || dateTo) && <button className="btn btn-outline" onClick={() => { setDateFrom(''); setDateTo(''); }}>Clear dates</button>}
        <button className="btn btn-outline" onClick={() => setReload((n) => n + 1)}>Refresh</button>
        <button className="btn btn-primary" onClick={() => exportCsv(rows)} disabled={!rows.length} title="Download the rows shown as CSV">
          Export &#8595;
        </button>
      </div>

      {data && (
        <div className="table-notice">
          {data.rows.length
            ? `${data.rows.length} rejected record${data.rows.length === 1 ? '' : 's'} across ${data.clients} client${data.clients === 1 ? '' : 's'}. Click a row to open it in Tables.`
            : 'No rejected integration records right now.'}
          {data.hiddenBeforeCutoff > 0 && data.cutoff && ` ${data.hiddenBeforeCutoff} ${data.cutoff.modules.join(' / ')} rejection${data.hiddenBeforeCutoff === 1 ? '' : 's'} from before ${new Date(data.cutoff.from).toLocaleDateString()} hidden.`}
          {data.excludedCompleted > 0 && ` ${data.excludedCompleted} old rejection${data.excludedCompleted === 1 ? '' : 's'} hidden because the client is Completed.`}
          {data.completedCheck === false && ' Completed status could not be checked, so completed clients may also be listed.'}
          {data.errors.length > 0 && ` Could not read: ${data.errors.map((e) => e.label).join(', ')}.`}
        </div>
      )}

      <div className="table-card">
        {error ? <div className="state-msg">{error}</div> : !data ? <div className="state-msg">Loading…</div> : rows.length === 0 ? (
          <div className="state-msg">{data.rows.length ? 'No records match your filters.' : 'Nothing needs attention.'}</div>
        ) : (
          <table className="data-table data-table--compact">
            <thead>
              <tr>
                <th>Unique ID</th>
                <th>Client Code</th>
                <th>PAN</th>
                <th>Client Name</th>
                <th>Rejected Module</th>
                <th>Current Status</th>
                <th>Error / Rejection Reason</th>
                <th>Last Updated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const key = `${r.module}-${r.unique_id}`;
                return (
                  <Fragment key={key}>
                    <tr
                      className="clickable-row"
                      onClick={(e) => {
                        // Copy / View response / Open buttons handle their own clicks.
                        if (e.target.closest('button, a')) return;
                        open(r);
                      }}
                    >
                      <td className="mono">{r.unique_id}</td>
                      <td><CopyableCell value={r.client_code} /></td>
                      <td className="mono"><CopyableCell value={r.pan} /></td>
                      <td>{r.client_name || 'N/A'}</td>
                      <td><b>{r.module_label}</b></td>
                      <td><span className="pill pill-no">{r.status}</span></td>
                      <td style={{ maxWidth: 360, whiteSpace: 'normal', textAlign: 'left' }}>
                        {r.reason || <span className="na">Not recorded</span>}
                        {r.response && (
                          <div>
                            <button className="link-btn" onClick={(e) => { e.stopPropagation(); setShownResponse((k) => (k === key ? null : key)); }}>
                              {shownResponse === key ? 'Hide response' : 'View response'}
                            </button>
                          </div>
                        )}
                      </td>
                      <td>{fmtDate(r.updated_at)}</td>
                      <td>
                        <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); open(r); }}>
                          Open in {r.module_label}
                        </button>
                      </td>
                    </tr>
                    {shownResponse === key && (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'left' }}>
                          <strong>{r.module_label} response</strong>
                          <pre style={{ margin: '6px 0 0', maxHeight: 320, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12 }}>{r.response}</pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
