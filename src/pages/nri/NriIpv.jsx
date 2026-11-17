import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api';
import Layout from '../../components/Layout';
import CopyableCell from '../../components/CopyableCell';
import StatusPill from '../../components/StatusPill';
import { formatLabel, orNa } from '../../utils/format';
import { ACCOUNT_TYPES, cleanParams, duration, formatDateTime, typeLabel } from '../../utils/nri';

const PAGE_SIZE = 25;
const FILTER_KEYS = ['search', 'type', 'status', 'dateFrom', 'dateTo'];

const COLUMNS = [
  { key: 'created_at', label: 'Requested' },
  { key: 'id', label: 'IPV ID' },
  { key: 'account_type', label: 'Account Type' },
  { key: 'client_name', label: 'Client Name' },
  { key: 'pan_number', label: 'PAN Number' },
  { key: 'email', label: 'Client Email' },
  { key: 'rm', label: 'RM' },
  { key: 'started_at', label: 'Call Started' },
  { key: 'duration', label: 'Duration' },
  { key: 'status', label: 'Status' },
];
const ALWAYS = new Set(['created_at', 'id', 'client_name', 'pan_number', 'status']);

// nre_nro.nri_ipv: the two-way video call between the client and the RM.
export default function NriIpv() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, searchParams.get(k) || '']));
  const page = Math.max(parseInt(searchParams.get('page'), 10) || 1, 1);
  const [search, setSearch] = useState(filters.search);
  const [result, setResult] = useState({ data: [], total: 0, statuses: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const update = (changes) => setSearchParams(cleanParams({ ...filters, page: '', ...changes }), { replace: true });

  useEffect(() => {
    if (search === filters.search) return undefined;
    const timer = setTimeout(() => update({ search }), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const queryKey = searchParams.toString();
  useEffect(() => {
    setLoading(true);
    setError('');
    api.get('/nri/ipv', { params: cleanParams({ ...filters, page, pageSize: PAGE_SIZE }) })
      .then(({ data }) => setResult(data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load IPV records'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  const rows = result.data;
  const shown = useMemo(
    () => COLUMNS.filter((c) => ALWAYS.has(c.key) || rows.some((r) => (c.key === 'duration' ? r.started_at && r.ended_at : r[c.key] !== null && r[c.key] !== ''))),
    [rows]
  );
  const total = result.total;
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  function renderCell(key, r) {
    switch (key) {
      case 'created_at': return formatDateTime(r.created_at);
      case 'account_type': return r.account_type ? <span className={`nri-type nri-type--${String(r.account_type).toLowerCase()}`}>{typeLabel(r.account_type)}</span> : <span className="na">N/A</span>;
      case 'pan_number':
        return <CopyableCell value={r[key]} />;
      case 'started_at': return r.started_at ? formatDateTime(r.started_at) : <span className="na">N/A</span>;
      case 'duration': return duration(r.started_at, r.ended_at) || <span className="na">N/A</span>;
      case 'status': return <StatusPill value={formatLabel(r.status)} />;
      default: return orNa(r[key]);
    }
  }

  return (
    <Layout title="IPV Video Verification">
      <div className="filters-bar">
        <input
          className="search-input"
          type="text"
          placeholder="Search Name, PAN, Email, RM, ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={filters.type} onChange={(e) => update({ type: e.target.value })}>
          <option value="">NRI</option>
          {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {result.statuses?.length > 0 && (
          <select value={filters.status} onChange={(e) => update({ status: e.target.value })}>
            <option value="">All Statuses</option>
            {result.statuses.map((v) => <option key={v} value={v}>{formatLabel(v)}</option>)}
          </select>
        )}
        <input type="date" value={filters.dateFrom} onChange={(e) => update({ dateFrom: e.target.value })} title="From date" />
        <input type="date" value={filters.dateTo} onChange={(e) => update({ dateTo: e.target.value })} title="To date" />
      </div>

      <div className="table-card">
        {loading ? (
          <div className="state-msg">Loading IPV records...</div>
        ) : error ? (
          <div className="state-msg">{error}</div>
        ) : result.missing ? (
          <div className="state-msg">Table nre_nro.{result.missing} was not found.</div>
        ) : rows.length === 0 ? (
          <div className="state-msg">No records match your filters.</div>
        ) : (
          <table className="data-table data-table--center">
            <thead><tr>{shown.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="clickable-row"
                  onClick={(e) => {
                    if (e.target.closest('button, a')) return;
                    if (r.id) navigate(`/nri/ipv/${encodeURIComponent(r.id)}`);
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
            <span>{`Showing ${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, total)} of ${total}`}</span>
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
