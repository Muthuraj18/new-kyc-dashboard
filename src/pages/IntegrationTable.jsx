import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Navigate } from 'react-router-dom';
import api from '../api';
import Layout from '../components/Layout';
import { INTEGRATION_TABLES } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

const PAGE_SIZE = 25;
const EDIT_ROLES = ['Super Admin', 'Admin'];
const fmtDate = (v) => (v ? new Date(v).toLocaleString() : 'N/A');
const asText = (v) => (v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));

// Row editor: every column of one row. Edits apply to THIS table only.
function RowEditor({ tableKey, uniqueId, onClose, onSaved }) {
  const [row, setRow] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [onlyEditable, setOnlyEditable] = useState(false);
  const [pending, setPending] = useState({});
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    api.get(`/tables/${tableKey}/${encodeURIComponent(uniqueId)}`)
      .then(({ data }) => setRow(data.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load the row'));
  }, [tableKey, uniqueId]);

  const pendingCount = Object.keys(pending).length;
  const original = useMemo(() => Object.fromEntries((row?.columns || []).map((c) => [c.name, c.value])), [row]);

  const setValue = (name, value) => setPending((p) => {
    const next = { ...p };
    if (asText(original[name]) === value) delete next[name]; else next[name] = value;
    return next;
  });

  const save = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const expected = Object.fromEntries(Object.keys(pending).map((n) => [n, original[n]]));
      const { data } = await api.post(`/tables/${tableKey}/${encodeURIComponent(uniqueId)}`, {
        changes: pending,
        expected,
        reason: reason.trim() || null,
      });
      setRow(data.data.row);
      setPending({});
      setReason('');
      onSaved(data.data);
    } catch (err) {
      setSaveError(err.response?.data?.error || 'Failed to save the changes');
    } finally {
      setSaving(false);
    }
  };

  const tryClose = () => {
    if (pendingCount && !window.confirm('Discard unsaved changes?')) return;
    onClose();
  };

  const columns = (row?.columns || []).filter((c) => (!onlyEditable || c.editable)
    && (!filter || c.name.toLowerCase().includes(filter.toLowerCase())
      || asText(pending[c.name] ?? c.value).toLowerCase().includes(filter.toLowerCase())));

  return (
    <div className="modal-backdrop" onClick={saving ? undefined : tryClose}>
      <div className="modal-card table-row-card" onClick={(e) => e.stopPropagation()}>
        <h3>{row ? `${row.label} · ${uniqueId}` : 'Loading…'}</h3>
        {row?.client && (
          <p className="table-row-sub">
            {row.client.itr_name || 'N/A'} · Client code {row.client.client_code || 'N/A'} · {row.client.kyc_type || ''}
          </p>
        )}
        <p className="table-row-note">
          Changes here update only <b>{row?.table || 'this table'}</b>. Client Details and the other
          tables are not changed. Saving also sets this row's push status back to <b>Pending</b> so it
          is pushed again.
        </p>

        {error ? <div className="form-error">{error}</div> : !row ? <div className="state-msg">Loading…</div> : (
          <>
            <div className="table-row-tools">
              <input type="text" placeholder="Filter fields or values…" value={filter} onChange={(e) => setFilter(e.target.value)} />
              <label className="ack-row" style={{ margin: 0 }}>
                <input type="checkbox" checked={onlyEditable} onChange={(e) => setOnlyEditable(e.target.checked)} />
                <span>Editable only</span>
              </label>
              <span className="table-row-count">{columns.length} of {row.columns.length} fields</span>
            </div>
            <div className="table-row-fields">
              {columns.map((c) => {
                const edited = Object.prototype.hasOwnProperty.call(pending, c.name);
                const value = edited ? pending[c.name] : asText(c.value);
                return (
                  <div key={c.name} className={`trf${edited ? ' trf--edited' : ''}${c.editable ? '' : ' trf--ro'}`}>
                    <label htmlFor={`f-${c.name}`}>
                      {c.name}
                      <small>{c.type}{c.max ? `(${c.max})` : ''}{c.editable ? '' : ' · read-only'}</small>
                    </label>
                    {!c.editable ? (
                      <div className="trf-ro" title="Read-only">{asText(c.value) || <span className="na">(empty)</span>}</div>
                    ) : c.type === 'boolean' ? (
                      <select id={`f-${c.name}`} className="field-input" value={value} disabled={saving} onChange={(e) => setValue(c.name, e.target.value)}>
                        <option value="">(empty)</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    ) : value.length > 80 ? (
                      <textarea id={`f-${c.name}`} className="field-input" rows={3} value={value} maxLength={c.max || undefined}
                        disabled={saving} onChange={(e) => setValue(c.name, e.target.value)} />
                    ) : (
                      <input id={`f-${c.name}`} className="field-input" value={value} maxLength={c.max || undefined}
                        type={c.type === 'date' ? 'date' : 'text'} disabled={saving} onChange={(e) => setValue(c.name, e.target.value)} />
                    )}
                    {edited && <div className="trf-old">was: {asText(c.value) || '(empty)'}</div>}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {saveError && <div className="form-error" style={{ marginTop: 12 }}>{saveError}</div>}
        <div className="table-row-footer">
          <input
            type="text"
            className="field-input"
            placeholder="Reason (optional, saved in the audit log)"
            value={reason}
            disabled={saving || !pendingCount}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={tryClose} disabled={saving}>Close</button>
            <button className="btn btn-outline" onClick={() => setPending({})} disabled={saving || !pendingCount}>Discard</button>
            <button className="btn btn-primary" onClick={save} disabled={saving || !pendingCount}>
              {saving ? 'Saving…' : `Save ${pendingCount || ''} change${pendingCount === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IntegrationTable() {
  const { table } = useParams();
  // ?open=<unique_id> (from Need Attention): filter to that client and open its row.
  const [searchParams] = useSearchParams();
  const openParam = searchParams.get('open');
  const navigate = useNavigate();
  const { user } = useAuth();
  const def = INTEGRATION_TABLES.find((t) => t.key === table);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => { setPage(1); setSearch(openParam || ''); setOpenId(openParam || null); }, [table, openParam]);

  useEffect(() => {
    if (!def) return undefined;
    const t = setTimeout(() => {
      setError('');
      api.get(`/tables/${table}`, { params: { search: search || undefined, page, pageSize: PAGE_SIZE } })
        .then(({ data: res }) => setData(res.data))
        .catch((err) => setError(err.response?.data?.error || 'Failed to load the table'));
    }, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [table, search, page, reload, def]);

  if (!EDIT_ROLES.includes(user?.role)) {
    return <Layout title="Tables"><div className="table-card state-msg">Only an Admin or Super Admin can view the tables.</div></Layout>;
  }
  if (!def) return <Navigate to="/tables/cvlkra" replace />;

  const totalPages = data ? Math.max(Math.ceil(data.total / PAGE_SIZE), 1) : 1;

  return (
    <Layout title={`Tables · ${def.label}`}>
      <div className="filters-bar">
        <select value={table} onChange={(e) => navigate(`/tables/${e.target.value}`)} aria-label="Table">
          {INTEGRATION_TABLES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
        <input
          type="text"
          placeholder="Search unique ID, client code, name, PAN…"
          value={search}
          onChange={(e) => { setPage(1); setSearch(e.target.value); }}
          style={{ flex: 1, minWidth: 240 }}
        />
      </div>

      {notice && <div className="table-notice">{notice}</div>}

      <div className="table-card">
        {error ? <div className="state-msg">{error}</div> : !data ? <div className="state-msg">Loading…</div> : data.rows.length === 0 ? (
          <div className="state-msg">No rows found.</div>
        ) : (
          <table className="data-table data-table--compact">
            <thead>
              <tr>
                <th>Unique ID</th>
                <th>Client Code</th>
                <th>Name</th>
                <th>PAN</th>
                <th>Push Status</th>
                <th>Updated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.unique_id} className="clickable-row" onClick={() => setOpenId(r.unique_id)}>
                  <td className="mono">{r.unique_id}</td>
                  <td>{r.client_code || 'N/A'}</td>
                  <td>{r.name || 'N/A'}</td>
                  <td className="mono">{r.pan || 'N/A'}</td>
                  <td>{r.status || 'N/A'}</td>
                  <td>{fmtDate(r.updated_at)}</td>
                  <td>
                    <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); setOpenId(r.unique_id); }}>
                      View / Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data && data.total > PAGE_SIZE && (
          <div className="pagination">
            <span>Page {page} of {totalPages} · {data.total} rows</span>
            <div className="pagination-controls">
              <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>

      {openId && (
        <RowEditor
          tableKey={table}
          uniqueId={openId}
          onClose={() => setOpenId(null)}
          onSaved={(res) => {
            const status = res.status?.reset ? ` ${res.status.field} reset to ${res.status.new} so it is pushed again.` : '';
            setNotice(`${res.updated.length} field${res.updated.length === 1 ? '' : 's'} saved in ${res.table} only (unique ID ${res.uniqueId}): ${res.updated.map((u) => u.field).join(', ')}.${status}`);
            setTimeout(() => setNotice(''), 6000);
            setReload((n) => n + 1);
          }}
        />
      )}
    </Layout>
  );
}
