import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Layout from '../components/Layout';
import CopyableCell from '../components/CopyableCell';
import StatusPill from '../components/StatusPill';
import ActionsMenu from '../components/ActionsMenu';
import ClientEditModal from '../components/ClientEditModal';
import ReasonModal from '../components/ReasonModal';
import { useAuth } from '../context/AuthContext';
import useFeatures from '../hooks/useFeatures';
import { formatDate, formatLabel, orNa } from '../utils/format';

const PAGE_SIZE = 25;
const CLIENT_ACTION_ROLES = ['Super Admin', 'Admin'];

// Dashboard-only status (same rule as the backend): esigned -> Verify, else In Progress.
// Used by the filter dropdown; the Status column shows the Re-KYC match (rekyc_status).
const DASHBOARD_STATUSES = [
  { value: 'verify', label: 'Verify' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' }, // Re-KYC client_id + PAN match
];

// Common reasons offered in the Skip Payment popup ("Other" is added automatically).
const SKIP_PAYMENT_REASONS = [
  'Payment collected offline (cash / bank transfer)',
  'Fee waived - staff / employee account',
  'Fee waived - management approval',
  'Paid, but payment not reflected in system',
  'Already paid on an earlier application',
];

export default function Clients() {
  const [filters, setFilters] = useState({
    search: '',
    kycType: '',
    dashboardStatus: '',
    stage: '',
    dateFrom: '',
    dateTo: '',
  });
  const [filterOptions, setFilterOptions] = useState({ kycTypes: [], statuses: [], stages: [], dashboardStatuses: [] });
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalState, setModalState] = useState(null); // { record, readOnly }
  const [reasonAction, setReasonAction] = useState(null); // { type: 'delete' | 'skip', record }
  const { user } = useAuth();
  const features = useFeatures();
  const navigate = useNavigate();

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

  // Delete / Skip Payment: the backend enforces role, reason and transaction safety;
  // these only open the reason dialog.
  const canAct = CLIENT_ACTION_ROLES.includes(user?.role) && features.trash && features.auditLogs;

  const handleDelete = async (record, reason) => {
    // The identifiers shown in the popup; the backend refuses the delete if they no longer match.
    const confirm = { unique_id: record.unique_id, pan_number: record.pan_number, client_code: record.client_code };
    // POST, not DELETE: the API Gateway CORS config only allows GET/POST/PATCH/PUT.
    await api.post(`/clients/${record.id}/delete`, { reason, confirm });
    setRows((prev) => prev.filter((r) => r.id !== record.id));
    setTotal((t) => t - 1);
    setReasonAction(null);
  };

  const handleSkipPayment = async (record, reason) => {
    const { data } = await api.post(`/clients/${record.id}/skip-payment`, { reason });
    setRows((prev) => prev.map((r) => (r.id === record.id ? data.data : r)));
    setReasonAction(null);
  };

  // Shown in the Delete / Skip popups so the admin can verify the client.
  const clientDetails = (r) => [
    { label: 'Client Name', value: r.client_name },
    { label: 'PAN Number', value: r.pan_number },
    { label: 'Client Code', value: r.client_code },
    { label: 'Unique ID', value: r.unique_id },
  ];

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
        {/* Dashboard-only status: esigned = Verify, everything else = In Progress; Completed = Re-KYC match */}
        <select value={filters.dashboardStatus} onChange={handleFilterChange('dashboardStatus')} title="Verify = eSigned; In Progress = every other stage; Completed = Re-KYC client ID + PAN match">
          <option value="">All Clients</option>
          {DASHBOARD_STATUSES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
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
                <th>Mobile Number</th>
                <th>Current Stage</th>
                <th>Status</th>
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
                <tr
                  key={r.id}
                  className="clickable-row"
                  onClick={(e) => {
                    // Copy / Actions / Check PDF buttons handle their own clicks.
                    if (e.target.closest('button, a, .actions-wrap')) return;
                    navigate(`/clients/${r.id}`);
                  }}
                >
                  <td>{formatDate(r.created_at)}</td>
                  <td>{orNa(r.application_id)}</td>
                  <td>{orNa(r.kyc_type)}</td>
                  <td><CopyableCell value={r.client_code} /></td>
                  <td>{orNa(r.client_name)}</td>
                  <td><CopyableCell value={r.pan_number} /></td>
                  <td>{orNa(r.email)}</td>
                  <td><CopyableCell value={r.mobile_number} /></td>
                  <td>{formatLabel(r.current_stage)}</td>
                  {/* Re-KYC match only: Completed, otherwise blank */}
                  <td>{r.rekyc_status === 'Completed' && <span className="pill pill-completed">Completed</span>}</td>
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
                      onSkipPayment={canAct ? () => setReasonAction({ type: 'skip', record: r }) : undefined}
                      skipPaymentDisabled={r.current_stage === 'payment'
                        ? null
                        : `Only at Payment stage (now: ${formatLabel(r.current_stage) || 'N/A'})`}
                      onDelete={canAct ? () => setReasonAction({ type: 'delete', record: r }) : undefined}
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

      {reasonAction?.type === 'delete' && (
        <ReasonModal
          danger
          title="Delete client"
          details={clientDetails(reasonAction.record)}
          confirmLabel="Delete permanently"
          acknowledge="I have verified the PAN number, client code and unique ID above, and understand this removes the client and all related records from the active database."
          onConfirm={(reason) => handleDelete(reasonAction.record, reason)}
          onClose={() => setReasonAction(null)}
        >
          A full snapshot of the client and its related records (CVL KRA, CDSL, NSE, BSE, MF,
          TechExcel) is stored permanently in Trash, with your name and the reason, before the
          client is removed. It cannot be undone from the dashboard.
        </ReasonModal>
      )}

      {reasonAction?.type === 'skip' && (
        <ReasonModal
          title="Skip payment stage"
          details={clientDetails(reasonAction.record)}
          reasonLabel="Why skip payment?"
          reasonOptions={SKIP_PAYMENT_REASONS}
          confirmLabel="Skip payment"
          onConfirm={(reason) => handleSkipPayment(reasonAction.record, reason)}
          onClose={() => setReasonAction(null)}
        >
          Payment will be marked <b>SKIPPED</b> (not paid) and the client moves to the next
          stage. The action and reason are recorded in the audit log.
        </ReasonModal>
      )}
    </Layout>
  );
}
