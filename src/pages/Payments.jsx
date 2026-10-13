import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import Layout from '../components/Layout';
import { orNa } from '../utils/format';

const PAGE_SIZE = 15;

// Page buttons to show: first, last, and a window around the current page,
// e.g. [1, '...', 4, 5, 6, '...', 20].
function pageNumbers(current, totalPages) {
  const pages = [];
  for (let n = 1; n <= totalPages; n += 1) {
    if (n === 1 || n === totalPages || Math.abs(n - current) <= 1) {
      pages.push(n);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }
  return pages;
}

const STATUS_CLASS = { Success: 'pill-completed', Pending: 'pill-warning', Failed: 'pill-no', Skipped: 'pill-pending' };

const CARDS = [
  { key: 'total', label: 'Total Transactions', status: '', tone: '' },
  { key: 'Success', label: 'Successful Transactions', status: 'Success', tone: 'stat-success' },
  { key: 'Pending', label: 'Pending Transactions', status: 'Pending', tone: 'stat-warning' },
  { key: 'Failed', label: 'Failed Transactions', status: 'Failed', tone: 'stat-danger' },
  { key: 'Skipped', label: 'Skipped (by admin)', status: 'Skipped', tone: '' },
];

const EMPTY_SUMMARY = {
  total: { count: 0, amount: 0 },
  Success: { count: 0, amount: 0 },
  Pending: { count: 0, amount: 0 },
  Failed: { count: 0, amount: 0 },
  Skipped: { count: 0, amount: 0 },
};

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });

function formatAmount(value) {
  if (value === null || value === undefined || value === '') return 'N/A';
  return inr.format(Number(value));
}

// 30/09/2026, 14:53:21
function formatDateTime(value) {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleString('en-GB', { hour12: false });
}

function cleanParams(params) {
  const out = { ...params };
  Object.keys(out).forEach((k) => { if (!out[k]) delete out[k]; });
  return out;
}

export default function Payments() {
  const [filters, setFilters] = useState({
    clientName: '',
    mobile: '',
    transactionId: '',
    status: '',
    dateFrom: '',
    dateTo: '',
  });
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isTyping = Boolean(filters.clientName || filters.mobile || filters.transactionId);

  // The summary cards follow every filter except status, so they change as you filter.
  useEffect(() => {
    const timeout = setTimeout(() => {
      const { status, ...rest } = filters;
      api.get('/payments/summary', { params: cleanParams(rest) })
        .then(({ data }) => setSummary(data))
        .catch(() => setSummary(EMPTY_SUMMARY));
    }, isTyping ? 350 : 0);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.clientName, filters.mobile, filters.transactionId, filters.dateFrom, filters.dateTo]);

  useEffect(() => {
    const timeout = setTimeout(fetchPayments, isTyping ? 350 : 0);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  async function fetchPayments() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/payments', { params: cleanParams({ ...filters, page, pageSize: PAGE_SIZE }) });
      setRows(data.data);
      setTotal(data.total);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  const setFilter = (key, value) => {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
  };

  const handleFilterChange = (key) => (e) => setFilter(key, e.target.value);

  const handleExport = async () => {
    const response = await api.get('/payments/export', { params: cleanParams(filters), responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `kyc-payments-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const rangeLabel = useMemo(() => {
    if (total === 0) return '0 results';
    const start = (page - 1) * PAGE_SIZE + 1;
    const end = Math.min(page * PAGE_SIZE, total);
    return `Showing ${start}-${end} of ${total}`;
  }, [page, total]);

  return (
    <Layout title="KYC Dashboard">
      <div className="stat-grid">
        {CARDS.map((card) => (
          <button
            key={card.key}
            type="button"
            className={`stat-card ${card.tone} ${filters.status === card.status ? 'stat-active' : ''}`}
            onClick={() => setFilter('status', card.status)}
            title={card.status ? `Show only ${card.status.toLowerCase()} transactions` : 'Show all transactions'}
          >
            <span className="stat-label">{card.label}</span>
            <span className="stat-value">{summary[card.key].count.toLocaleString('en-IN')}</span>
            <span className="stat-amount">{inr.format(summary[card.key].amount)}</span>
          </button>
        ))}
      </div>

      <div className="filters-bar">
        <input type="text" placeholder="Client Name" value={filters.clientName} onChange={handleFilterChange('clientName')} />
        <input type="text" placeholder="Mobile Number" value={filters.mobile} onChange={handleFilterChange('mobile')} />
        <input type="text" placeholder="Transaction ID" value={filters.transactionId} onChange={handleFilterChange('transactionId')} />
        <select value={filters.status} onChange={handleFilterChange('status')}>
          <option value="">All Statuses</option>
          <option value="Success">Success</option>
          <option value="Pending">Pending</option>
          <option value="Failed">Failed</option>
          <option value="Skipped">Skipped</option>
        </select>
        <input type="date" value={filters.dateFrom} onChange={handleFilterChange('dateFrom')} title="From date" />
        <input type="date" value={filters.dateTo} onChange={handleFilterChange('dateTo')} title="To date" />
        <button className="btn btn-primary" onClick={handleExport}>Export Report &#8595;</button>
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
                <th>Client Name</th>
                <th>Mobile Number</th>
                <th>Transaction ID</th>
                <th>Amount</th>
                <th>Payment Date &#8595;</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{orNa(r.client_name)}</td>
                  <td>{orNa(r.mobile_number)}</td>
                  <td className="mono">{orNa(r.transaction_id)}</td>
                  <td><strong>{formatAmount(r.amount)}</strong></td>
                  <td>{formatDateTime(r.payment_date)}</td>
                  <td><span className={`pill ${STATUS_CLASS[r.status]}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="pagination">
            <span>{rangeLabel}</span>
            <div className="pagination-controls">
              <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              {pageNumbers(page, totalPages).map((n, i) =>
                n === '...' ? (
                  <span key={`gap-${i}`} className="page-gap">&hellip;</span>
                ) : (
                  <button
                    key={n}
                    className={`btn btn-sm ${n === page ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </button>
                )
              )}
              <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
