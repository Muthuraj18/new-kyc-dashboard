import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../api';
import Layout from '../../components/Layout';
import StatusPill from '../../components/StatusPill';
import { FieldsPanel, DocumentsPanels } from '../../components/NriRecordPanels';
import { formatLabel, orNa } from '../../utils/format';
import { duration, formatDateTime, typeLabel } from '../../utils/nri';

export default function NriIpvDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setData(null);
    setError('');
    api.get(`/nri/ipv/${encodeURIComponent(id)}`)
      .then((res) => setData(res.data.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load the IPV record'));
  }, [id]);

  const s = data?.summary;
  const sources = useMemo(() => [{ title: 'IPV documents', url: `/nri/ipv/${encodeURIComponent(id)}/documents` }], [id]);

  return (
    <Layout title="IPV Details">
      <div className="detail-back">
        <Link to="/nri/ipv" onClick={(e) => { if (window.history.length > 1) { e.preventDefault(); navigate(-1); } }}>
          &larr; Back
        </Link>
      </div>

      {error ? (
        <div className="table-card"><div className="state-msg">{error}</div></div>
      ) : (
        <>
          <div className="detail-header">
            <div className="detail-summary">
              <div><span>IPV ID</span><strong>{s ? orNa(s.id) : '…'}</strong></div>
              <div><span>Client Name</span><strong>{s ? orNa(s.client_name) : '…'}</strong></div>
              <div><span>PAN</span><strong>{s ? orNa(s.pan_number) : '…'}</strong></div>
              {s?.account_type && <div><span>Account Type</span><strong><span className={`nri-type nri-type--${String(s.account_type).toLowerCase()}`}>{typeLabel(s.account_type)}</span></strong></div>}
              {s?.email && <div><span>Client Email</span><strong>{s.email}</strong></div>}
              {s?.rm && <div><span>RM</span><strong>{s.rm}</strong></div>}
              {s?.status && <div><span>Status</span><strong><StatusPill value={formatLabel(s.status)} /></strong></div>}
              {s?.created_at && <div><span>Requested</span><strong>{formatDateTime(s.created_at)}</strong></div>}
              {s?.started_at && <div><span>Call Started</span><strong>{formatDateTime(s.started_at)}</strong></div>}
              {duration(s?.started_at, s?.ended_at) && <div><span>Duration</span><strong>{duration(s.started_at, s.ended_at)}</strong></div>}
              {s?.client_place && <div><span>Client Location</span><strong>{s.client_place}</strong></div>}
            </div>
            {s?.rm_remarks && <div className="nri-remarks"><span>RM Remarks</span><p>{s.rm_remarks}</p></div>}
          </div>

          {data && (
            <div className="detail-grid">
              <FieldsPanel title="IPV Record" columns={data.columns} record={data.record} />
              <DocumentsPanels sources={sources} />
            </div>
          )}

          {data && (
            <div className="nri-linked">
              <div className="table-card">
                <div className="nri-linked-title">NRE / NRO Applications <span className="nri-count">{data.applications.length}</span></div>
                {data.applications.length === 0 ? (
                  <div className="state-msg">No NRE / NRO application found for this PAN.</div>
                ) : (
                  <table className="data-table">
                    <thead><tr><th>Account Type</th><th>Unique ID</th><th>Client Name</th><th>Stage</th><th>Status</th><th /></tr></thead>
                    <tbody>
                      {data.applications.map((a) => (
                        <tr key={`${a.account_type}-${a.id}`}>
                          <td><span className={`nri-type nri-type--${a.account_type}`}>{typeLabel(a.account_type)}</span></td>
                          <td>{orNa(a.application_id || a.id)}</td>
                          <td>{orNa(a.client_name)}</td>
                          <td>{a.stage_label || formatLabel(a.current_stage)}</td>
                          <td><StatusPill value={a.status} /></td>
                          <td>{a.id && <Link to={`/nri/applications/${a.account_type}/${encodeURIComponent(a.id)}`}>Open &rarr;</Link>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
