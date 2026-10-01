import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import Layout from '../components/Layout';
import CopyableCell from '../components/CopyableCell';
import StatusPill from '../components/StatusPill';
import ActionsMenu from '../components/ActionsMenu';
import ClientEditModal from '../components/ClientEditModal';
import useFeatures from '../hooks/useFeatures';
import { formatDate, formatLabel, orNa } from '../utils/format';

const PAGE_SIZE = 25;

export default function Clients() {
  const [filters, setFilters] = useState({
    search: '',
    kycType: '',
    status: '',
    stage: '',
    dateFrom: '',
    dateTo: '',
  });
  const [filterOptions, setFilterOptions] = useState({ kycTypes: [], statuses: [], stages: [] });
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalState, setModalState] = useState(null); // { record, readOnly }
  const features = useFeatures();

  useEffect(() => {
    api.get('/clients/filters').then(({ data }) => setFilterOptions(data)).catch(() => {});
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchClients();
    }, filters.search ? 350 : 0);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  async function fetchClients() {
    setLoading(true);
    setError('');
    try {
      const params = { ...filters, page, pageSize: PAGE_SIZE };
      Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });
      const { data } = await api.get('/clients', { params });
      setRows(data.data);
      setTotal(data.total);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  const handleFilterChange = (key) => (e) => {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: e.target.value }));
  };

  const handleExport = async () => {
    const params = { ...filters };
    Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });
    const response = await api.get('/clients/export', { params, responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `kyc-clients-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleSave = async (form) => {
    const { data } = await api.patch(`/clients/${modalState.record.id}`, form);
    setRows((prev) => prev.map((r) => (r.id === data.data.id ? data.data : r)));
    setModalState(null);
  };

  const handleDelete = async (record) => {
    if (!window.confirm(`Move ${record.client_name || record.application_id || record.client_code} to Trash?`)) return;
    await api.delete(`/clients/${record.id}`);
    setRows((prev) => prev.filter((r) => r.id !== record.id));
    setTotal((t) => t - 1);
  };

  const handleViewPdf = async (record) => {
    try {
      const response = await api.get(`/clients/${record.id}/esign-pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch (err) {
      alert(err.response?.data?.error || 'Esign PDF not available for this client');
    }
  };

  const rangeLabel = useMemo(() => {
    if (total === 0) return '0 results';
    const start = (page - 1) * PAGE_SIZE + 1;
    const end = Math.min(page * PAGE_SIZE, total);
    return `Showing ${start}-${end} of ${total}`;
  }, [page, total]);

  return (
    <Layout title="KYC Dashboard">
      <div className="filters-bar">
        <input
          className="search-input"
          type="text"
          placeholder="Search Code, PAN, Email..."
          value={filters.search}
          onChange={handleFilterChange('search')}
        />
        <select value={filters.kycType} onChange={handleFilterChange('kycType')}>
          <option value="">All KYC Types</option>
          {filterOptions.kycTypes.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={filters.status} onChange={handleFilterChange('status')}>
          <option value="">All Statuses</option>
          {filterOptions.statuses.map((v) => <option key={v} value={v}>{formatLabel(v)}</option>)}
        </select>
        <select value={filters.stage} onChange={handleFilterChange('stage')}>
          <option value="">All Stages</option>
          {filterOptions.stages.map((v) => <option key={v} value={v}>{formatLabel(v)}</option>)}
        </select>
        <input type="date" value={filters.dateFrom} onChange={handleFilterChange('dateFrom')} />
        <input type="date" value={filters.dateTo} onChange={handleFilterChange('dateTo')} />
        <button className="btn btn-primary" onClick={handleExport}>Export &#8595;</button>
      </div>

      <div className="table-card">
        {loading ? (
          <div className="state-msg">Loading clients...</div>
        ) : error ? (
          <div className="state-msg">{error}</div>
        ) : rows.length === 0 ? (
          <div className="state-msg">No records match your filters.</div>
        ) : (
          <table className="data-table data-table--center">
            <thead>
              <tr>
                <th>Application Date</th>
                <th>Unique ID</th>
                <th>KYC Type</th>
                <th>Client Code</th>
                <th>Client Name</th>
                <th>PAN Number</th>
                <th>Email ID</th>
                <th>Current Stage</th>
                <th>KYC Status</th>
                <th>CVL KRA</th>
                <th>CDSL</th>
                <th>NSE</th>
                <th>BSE</th>
                <th>TECHEXCEL</th>
                <th>API Status</th>
                <th>Esign PDF</th>
                <th>Action/Edit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{formatDate(r.created_at)}</td>
                  <td>{orNa(r.application_id)}</td>
                  <td>{orNa(r.kyc_type)}</td>
                  <td><CopyableCell value={r.client_code} /></td>
                  <td>{orNa(r.client_name)}</td>
                  <td><CopyableCell value={r.pan_number} /></td>
                  <td>{orNa(r.email)}</td>
                  <td>{formatLabel(r.current_stage)}</td>
                  <td><StatusPill value={r.kyc_status} /></td>
                  <td><StatusPill value={r.cvlkra_push_status} /></td>
                  <td><StatusPill value={r.cdsl_push_status} /></td>
                  <td><StatusPill value={r.nse_push_status} /></td>
                  <td><StatusPill value={r.bse_status} /></td>
                  <td><StatusPill value={r.techexcel_push_status} /></td>
                  <td><StatusPill value={r.api_status} /></td>
                  <td>
                    {r.has_esign_pdf ? (
                      <button className="link-btn" onClick={() => handleViewPdf(r)}>Check PDF</button>
                    ) : (
                      <span className="na">N/A</span>
                    )}
                  </td>
                  <td>
                    <ActionsMenu
                      onView={() => setModalState({ record: r, readOnly: true })}
                      onEdit={() => setModalState({ record: r, readOnly: false })}
                      onDelete={features.trash ? () => handleDelete(r) : undefined}
                    />
                  </td>
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
              <span style={{ padding: '5px 8px' }}>Page {page} of {totalPages}</span>
              <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {modalState && (
        <ClientEditModal
          record={modalState.record}
          readOnly={modalState.readOnly}
          onClose={() => setModalState(null)}
          onSave={handleSave}
        />
      )}
    </Layout>
  );
}
