import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import Layout from '../../components/Layout';
import { orNa } from '../../utils/format';
import { cleanParams, downloadBlob } from '../../utils/nri';

// NRI Payments: every payment attempt in the NRE / NRO applications' `payments` JSON
// (one row per attempt). Same layout as the KYC Payments page.

const PAGE_SIZES = [25, 50, 100];
const TZ = 'Asia/Kolkata';

const STATUS_PILL = { success: 'pill-completed', pending: 'pill-warning', failed: 'pill-no' };
const STATUS_LABEL = { success: 'Success', pending: 'Pending', failed: 'Failed' };

const CARDS = [
  { key: 'total', label: 'Total Transactions', status: '', tone: '' },
  { key: 'success', label: 'Successful Transactions', status: 'success', tone: 'stat-success' },
  { key: 'pending', label: 'Pending Transactions', status: 'pending', tone: 'stat-warning' },
  { key: 'failed', label: 'Failed Transactions', status: 'failed', tone: 'stat-danger' },
  { key: 'test', label: 'Test (Dev Bypass)', status: 'test', tone: '' },
];
const EMPTY_SUMMARY = Object.fromEntries(CARDS.map((c) => [c.key, { count: 0, amount: 0 }]));

const COLUMNS = [
  { key: 'client_name', label: 'Client Name' },
  { key: 'mobile', label: 'Mobile Number' },
  { key: 'kyc_type', label: 'KYC Type' },
  { key: 'txn_key', label: 'Transaction ID' },
  { key: 'amount', label: 'Amount' },
  { key: 'payment_date', label: 'Payment Date' },
  { key: 'status', label: 'Status' },
];

const SCHEMES = { lifeTime: 'Lifetime', annualCare: 'Annual Care' };

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = (v) => (v === null || v === undefined || v === '' ? 'N/A' : inr.format(Number(v)));

// 17/11/2026, 17:38:19 (Asia/Kolkata)
function ist(value) {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleString('en-GB', { timeZone: TZ, hour12: false });
}

function StatusPill({ status, isTest }) {
  return (
    <span className="nri-pay-status">
      <span className={`pill ${STATUS_PILL[status] || 'pill-pending'}`}>{STATUS_LABEL[status] || orNa(status)}</span>
      {isTest && <span className="nri-test-tag" title="Test payment (Razorpay bypassed)">Test</span>}
    </span>
  );
}

function pageNumbers(current, totalPages) {
  const pages = [];
  for (let n = 1; n <= totalPages; n += 1) {
    if (n === 1 || n === totalPages || Math.abs(n - current) <= 1) pages.push(n);
    else if (pages[pages.length - 1] !== '...') pages.push('...');
  }
  return pages;
}

// Side drawer: client details and every attempt for the PAN, with the raw Razorpay response.
function AttemptsDrawer({ row, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    api.get('/nri/payments/attempts', { params: { type: row.type_key, pan: row.pan_number } })
      .then(({ data: res }) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load the payment attempts'));
  }, [row]);

  const c = data?.client;
  const field = (label, value) => (
    <div className="nri-drawer-field"><span>{label}</span><strong>{orNa(value)}</strong></div>
  );

  return (
    <div className="nri-drawer-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="nri-drawer" role="dialog" aria-label="Payment details">
        <div className="nri-drawer-head">
          <div>
            <div className="nri-drawer-title">{row.client_name}</div>
            <div className="nri-drawer-sub">{row.kyc_type} · {row.pan_number}</div>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>Close</button>
        </div>

        {error && <div className="state-msg nri-error">{error}</div>}
        {!data && !error && <div className="state-msg">Loading…</div>}
        {c && (
          <>
            <div className="nri-drawer-grid">
              {field('PAN', c.pan_number)}
              {field('Mobile', c.mobile)}
              {field('Email', c.registered_email)}
              {field('RM Email', c.rm_email)}
              {field('Client Code', c.client_code)}
              {field('Scheme', c.scheme_key ? `${SCHEMES[c.scheme_key] || c.scheme_key}${c.scheme_total_amount ? ` · ${money(c.scheme_total_amount)}` : ''}` : null)}
              {field('Application Status', c.application_status)}
            </div>
            {c.app_id && (
              <Link className="nri-drawer-link" to={`/nri/applications/${c.type_key}/${encodeURIComponent(c.app_id)}`}>
                Open client details &rarr;
              </Link>
            )}

            <div className="nri-drawer-section">All attempts ({data.attempts.length})</div>
            {data.attempts.map((a) => (
              <div key={a.txn_key} className={`nri-attempt${a.txn_key === row.txn_key ? ' current' : ''}`}>
                <div className="nri-attempt-head">
                  <span className="mono">{a.txn_key}</span>
                  <StatusPill status={a.status} isTest={a.is_test} />
                </div>
                <div className="nri-drawer-grid">
                  {field('Amount', money(a.amount))}
                  {field('Payment Method', a.payment_method)}
                  {field('Razorpay Payment ID', a.razorpay_payment_id)}
                  {field('Initiated', ist(a.initiated_at))}
                  {field('Updated', ist(a.updated_at))}
                </div>
                {a.raw_response && (
                  <details className="module-long">
                    <summary>Raw Razorpay response</summary>
                    <pre>{JSON.stringify(a.raw_response, null, 2)}</pre>
                  </details>
                )}
              </div>
            ))}
          </>
        )}
      </aside>
    </div>
  );
}

export default function NriPayments() {
  const [filters, setFilters] = useState({
    clientName: '', mobile: '', transactionId: '', pan: '', type: '', status: '', dateFrom: '', dateTo: '', showTest: false,
  });
  const [sort, setSort] = useState({ key: 'payment_date', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [drawer, setDrawer] = useState(null);

  const isTyping = Boolean(filters.clientName || filters.mobile || filters.transactionId || filters.pan);
  const params = () => cleanParams({ ...filters, showTest: filters.showTest ? '1' : '', sort: sort.key, dir: sort.dir });

  useEffect(() => {
    const timeout = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get('/nri/payments', { params: { ...params(), page, pageSize } });
        setRows(data.data);
        setTotal(data.total);
        setSummary(data.summary || EMPTY_SUMMARY);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load payments');
      } finally {
        setLoading(false);
      }
    }, isTyping ? 350 : 0);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sort, page, pageSize]);

  const setFilter = (key, value) => {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
  };
  const onInput = (key) => (e) => setFilter(key, e.target.value);

  const toggleSort = (key) => {
    setPage(1);
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'payment_date' || key === 'amount' ? 'desc' : 'asc' }));
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await api.get('/nri/payments/export', { params: params(), responseType: 'blob' });
      await downloadBlob(response, `nri-payments-${Date.now()}.csv`);
    } catch {
      alert('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const rangeLabel = useMemo(() => {
    if (total === 0) return '0 results';
    return `Showing ${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} of ${total}`;
  }, [page, pageSize, total]);

  function renderCell(key, r) {
    switch (key) {
      case 'client_name': return orNa(r.client_name);
      case 'mobile': return orNa(r.mobile);
      case 'kyc_type': return <span className={`nri-type nri-type--${r.type_key}`}>{r.kyc_type}</span>;
      case 'txn_key':
        return (
          <div className="nri-txn">
            <span className="mono">{r.txn_key}</span>
            {r.razorpay_payment_id && r.razorpay_payment_id !== r.txn_key && (
              <span className="nri-txn-sub mono" title="Razorpay payment ID">{r.razorpay_payment_id}</span>
            )}
          </div>
        );
      case 'amount': return <strong>{money(r.amount)}</strong>;
      case 'payment_date': return ist(r.payment_date);
      case 'status': return <StatusPill status={r.status} isTest={r.is_test} />;
      default: return null;
    }
  }

  return (
    <Layout title="NRI Dashboard">
      <div className="stat-grid">
        {CARDS.map((card) => (
          <button
            key={card.key}
            type="button"
            className={`stat-card ${card.tone} ${filters.status === card.status ? 'stat-active' : ''}`}
            onClick={() => setFilter('status', card.status)}
            title={card.status ? `Show only ${card.label.toLowerCase()}` : 'Show all transactions'}
          >
            <span className="stat-label">{card.label}</span>
            <span className="stat-value">{summary[card.key].count.toLocaleString('en-IN')}</span>
            <span className="stat-amount">{inr.format(summary[card.key].amount)}</span>
          </button>
        ))}
      </div>

      <div className="filters-bar">
        <input type="text" placeholder="Client Name" value={filters.clientName} onChange={onInput('clientName')} />
        <input type="text" placeholder="Mobile Number" value={filters.mobile} onChange={onInput('mobile')} />
        <input type="text" placeholder="Transaction ID" value={filters.transactionId} onChange={onInput('transactionId')} />
        <input type="text" placeholder="PAN" value={filters.pan} onChange={onInput('pan')} maxLength={10} style={{ textTransform: 'uppercase', width: 130 }} />
        <select value={filters.type} onChange={onInput('type')}>
          <option value="">NRI</option>
          <option value="nre">NRE</option>
          <option value="nro">NRO</option>
        </select>
        <select value={filters.status} onChange={onInput('status')}>
          <option value="">All Statuses</option>
          <option value="success">Success</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="test">Test (Dev Bypass)</option>
        </select>
        <input type="date" value={filters.dateFrom} onChange={onInput('dateFrom')} title="From date (IST)" />
        <input type="date" value={filters.dateTo} onChange={onInput('dateTo')} title="To date (IST)" />
        <label className="nri-toggle" title="DEV… transactions: test payments with Razorpay bypassed">
          <input type="checkbox" checked={filters.showTest} onChange={(e) => setFilter('showTest', e.target.checked)} />
          Show test payments
        </label>
        <button className="btn btn-primary" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Exporting…' : 'Export Report ↓'}
        </button>
      </div>

      <div className="table-card">
        {loading ? (
          <div className="state-msg">Loading transactions...</div>
        ) : error ? (
          <div className="state-msg">{error}</div>
        ) : rows.length === 0 ? (
          <div className="state-msg">No transactions match your filters.</div>
        ) : (
          <table className="data-table data-table--compact">
            <thead>
              <tr>
                {COLUMNS.map((c) => (
                  <th key={c.key}>
                    <button type="button" className="nri-sort" onClick={() => toggleSort(c.key)}>
                      {c.label}{sort.key === c.key ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={`${r.type_key}-${r.app_id}-${r.txn_key}`}
                  className="clickable-row"
                  onClick={(e) => { if (!e.target.closest('button, a')) setDrawer(r); }}
                >
                  {COLUMNS.map((c) => <td key={c.key}>{renderCell(c.key, r)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="pagination">
            <span>
              {rangeLabel}
              <select
                className="nri-page-size"
                value={pageSize}
                onChange={(e) => { setPage(1); setPageSize(Number(e.target.value)); }}
                aria-label="Rows per page"
              >
                {PAGE_SIZES.map((n) => <option key={n} value={n}>{n} / page</option>)}
              </select>
            </span>
            <div className="pagination-controls">
              <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
              {pageNumbers(page, totalPages).map((n, i) => (n === '...' ? (
                <span key={`gap-${i}`} className="page-gap">&hellip;</span>
              ) : (
                <button key={n} className={`btn btn-sm ${n === page ? 'btn-primary' : 'btn-outline'}`} onClick={() => setPage(n)}>{n}</button>
              )))}
              <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>

      {drawer && <AttemptsDrawer row={drawer} onClose={() => setDrawer(null)} />}
    </Layout>
  );
}
