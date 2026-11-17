import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api';
import Layout from '../../components/Layout';
import { cleanParams, fieldLabel, formatValue } from '../../utils/nri';
import { copyToClipboard } from '../../utils/format';
import { CopyIcon } from '../../components/icons';

const PAGE_SIZE = 50;

// nre_nro.boid_numbers: every BOID and the PAN it is assigned to (all columns shown).
export default function NriBoid() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = { search: searchParams.get('search') || '', state: searchParams.get('state') || '' };
  const page = Math.max(parseInt(searchParams.get('page'), 10) || 1, 1);
  const [search, setSearch] = useState(filters.search);
  const [result, setResult] = useState({ data: [], columns: [], roles: {}, total: 0 });
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
    api.get('/nri/boid', { params: cleanParams({ ...filters, page, pageSize: PAGE_SIZE }) })
      .then(({ data }) => setResult(data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load BOID numbers'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  const { data: rows, columns, roles = {}, total } = result;
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const copyable = new Set([roles.boid, roles.pan].filter(Boolean));

  return (
    <Layout title="BOID Numbers">
      <div className="filters-bar">
        <input
          className="search-input"
          type="text"
          placeholder="Search BOID, PAN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {result.hasState && (
          <select value={filters.state} onChange={(e) => update({ state: e.target.value })}>
            <option value="">All BOIDs</option>
            <option value="assigned">Used</option>
            <option value="available">Available</option>
          </select>
        )}
      </div>

      <div className="table-card">
        {loading ? (
          <div className="state-msg">Loading BOID numbers...</div>
        ) : error ? (
          <div className="state-msg">{error}</div>
        ) : result.missing ? (
          <div className="state-msg">Table nre_nro.{result.missing} was not found.</div>
        ) : rows.length === 0 ? (
          <div className="state-msg">No records match your filters.</div>
        ) : (
          <div className="nri-table-scroll">
            <table className="data-table data-table--center">
              <thead><tr>{columns.map((c) => <th key={c.name}>{fieldLabel(c.name)}</th>)}</tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <tr key={i}>
                    {columns.map((c) => {
                      const v = formatValue(r[c.name], c.type);
                      if (v.na) return <td key={c.name}><span className="na">N/A</span></td>;
                      return (
                        <td key={c.name}>
                          {v.long ? <span className="extra-cell" title={v.text}>{v.text}</span> : v.text}
                          {copyable.has(c.name) && (
                            <button className="copy-btn" onClick={() => copyToClipboard(v.text)} title="Copy"><CopyIcon /> Copy</button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
