import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api';
import Layout from '../../components/Layout';
import CopyableCell from '../../components/CopyableCell';
import StatusPill from '../../components/StatusPill';
import { formatDate, formatLabel, orNa } from '../../utils/format';
import { ACCOUNT_TYPES, cleanParams, downloadBlob, typeLabel } from '../../utils/nri';

const PAGE_SIZE = 25;
const FILTER_KEYS = ['search', 'type', 'status', 'stage', 'dateFrom', 'dateTo'];

const COLUMNS = [
  { key: 'created_at', label: 'Application Date' },
  { key: 'account_type', label: 'Account Type' },
  { key: 'application_id', label: 'Unique ID' },
  { key: 'client_code', label: 'Client Code' },
  { key: 'client_name', label: 'Client Name' },
  { key: 'pan_number', label: 'PAN Number' },
  { key: 'email', label: 'Email ID' },
  { key: 'mobile_number', label: 'Mobile Number' },
  { key: 'country', label: 'Country of Residence' },
  { key: 'current_stage', label: 'Current Step' },
  { key: 'status', label: 'Status' },
  { key: 'payment_status', label: 'Payment' },
  { key: 'esign_status', label: 'eSign' },
  { key: 'boid', label: 'BOID' },
  { key: 'rm', label: 'RM' },
];
// Always shown even when empty on the page.
const ALWAYS = new Set(['created_at', 'account_type', 'application_id', 'client_name', 'pan_number', 'current_stage', 'status']);

export default function NriApplications() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // Filters live in the URL, so dashboard cards can link to a filtered list and Back keeps them.
  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, searchParams.get(k) || '']));
  const page = Math.max(parseInt(searchParams.get('page'), 10) || 1, 1);
  const [search, setSearch] = useState(filters.search);
  const [options, setOptions] = useState({ statuses: [], stages: [] });
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const update = (changes) => {
    const next = cleanParams({ ...filters, page: '', ...changes });
    setSearchParams(next, { replace: true });
  };

  // Debounced search box.
  useEffect(() => {
    if (search === filters.search) return undefined;
    const timer = setTimeout(() => update({ search }), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    api.get('/nri/filters', { params: cleanParams({ type: filters.type }) })
      .then(({ data }) => setOptions(data))
      .catch(() => {});
  }, [filters.type]);

  const queryKey = searchParams.toString();
  useEffect(() => {
    setLoading(true);
    setError('');
    api.get('/nri/applications', { params: cleanParams({ ...filters, page, pageSize: PAGE_SIZE }) })
      .then(({ data }) => { setRows(data.data); setTotal(data.total); })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load applications'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await api.get('/nri/applications/export', { params: cleanParams(filters), responseType: 'blob' });
      await downloadBlob(response, `nre-nro-applications-${Date.now()}.csv`);
    } catch {
      alert('Export failed');
    } finally {
      setExporting(false);
    }
  };

  // Hide columns the tables don't have (empty on every row of this page).
  const shown = useMemo(
    () => COLUMNS.filter((c) => ALWAYS.has(c.key) || rows.some((r) => r[c.key] !== null && r[c.key] !== '')),
    [rows]
  );

  function renderCell(key, r) {
    switch (key) {
      case 'created_at': return formatDate(r.created_at);
      case 'account_type': return <span className={`nri-type nri-type--${r.account_type}`}>{typeLabel(r.account_type)}</span>;
      case 'client_code':
      case 'pan_number':
      case 'mobile_number':
      case 'boid':
        return <CopyableCell value={r[key]} />;
      case 'current_stage': return formatLabel(r.current_stage);
      case 'status': return <StatusPill value={r.status} />;
      case 'payment_status':
      case 'esign_status':
        return r[key] ? <StatusPill value={formatLabel(r[key])} /> : <span className="na">N/A</span>;
      default: return orNa(r[key]);
    }
  }

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const rangeLabel = total === 0 ? '0 results'
    : `Showing ${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, total)} of ${total}`;

  return (
    <Layout title="NRE - NRO Applications">
      <div className="filters-bar">
        <input
          className="search-input"
          type="text"
          placeholder="Search Name, PAN, Email, Mobile, ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={filters.type} onChange={(e) => update({ type: e.target.value, status: '', stage: '' })}>
          <option value="">NRE + NRO</option>
          {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label} only</option>)}
        </select>
        {options.statuses.length > 0 && (
          <select value={filters.status} onChange={(e) => update({ status: e.target.value })}>
            <option value="">All Statuses</option>
            {options.statuses.map((v) => <option key={v} value={v}>{formatLabel(v)}</option>)}
          </select>
        )}
        {options.stages.length > 0 && (
          <select value={filters.stage} onChange={(e) => update({ stage: e.target.value })}>
            <option value="">All Steps</option>
            {options.stages.map((v) => <option key={v} value={v}>{formatLabel(v)}</option>)}
          </select>
        )}
        <input type="date" value={filters.dateFrom} onChange={(e) => update({ dateFrom: e.target.value })} title="From date" />
        <input type="date" value={filters.dateTo} onChange={(e) => update({ dateTo: e.target.value })} title="To date" />
        <button className="btn btn-primary" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Exporting…' : 'Export ↓'}
        </button>
      </div>

      <div className="table-card">
        {loading ? (
          <div className="state-msg">Loading applications...</div>
        ) : error ? (
          <div className="state-msg">{error}</div>
        ) : rows.length === 0 ? (
          <div className="state-msg">No records match your filters.</div>
        ) : (
          <table className="data-table data-table--center">
            <thead>
              <tr>{shown.map((c) => <th key={c.key}>{c.label}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={`${r.account_type}-${r.id}`}
                  className="clickable-row"
                  onClick={(e) => {
                    if (e.target.closest('button, a')) return;
                    if (r.id) navigate(`/nri/applications/${r.account_type}/${encodeURIComponent(r.id)}`);
                  }}
                >
                  {shown.map((c) => <td key={c.key}>{renderCell(c.key, r)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="pagination">
            <span>{rangeLabel}</span>
            <div className="pagination-controls">
              <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => update({ page: page - 1 })}>Previous</button>
              <span style={{ padding: '5px 8px' }}>Page {page} of {totalPages}</span>
              <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => update({ page: page + 1 })}>Next</button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
