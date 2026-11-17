import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../api';
import Layout from '../../components/Layout';
import StatusPill from '../../components/StatusPill';
import { FieldsPanel, DocumentsPanels } from '../../components/NriRecordPanels';
import { formatLabel, orNa } from '../../utils/format';
import { duration, fieldLabel, formatDateTime, formatValue, typeLabel } from '../../utils/nri';

export default function NriApplicationDetail() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setData(null);
    setError('');
    api.get(`/nri/applications/${type}/${encodeURIComponent(id)}`)
      .then((res) => setData(res.data.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load the application'));
  }, [type, id]);

  const s = data?.summary;
  // Application documents, plus the IPV documents of each linked IPV session.
  const sources = useMemo(() => [
    { title: `${typeLabel(type)} documents`, url: `/nri/applications/${type}/${encodeURIComponent(id)}/documents` },
    ...(data?.ipv.rows || []).filter((r) => r.id).map((r, i, all) => ({
      title: all.length > 1 ? `IPV documents (session ${r.id})` : 'IPV documents',
      url: `/nri/ipv/${encodeURIComponent(r.id)}/documents`,
    })),
  ], [type, id, data]);

  return (
    <Layout title="NRE - NRO Client Details">
      <div className="detail-back">
        <Link to="/nri/applications" onClick={(e) => { if (window.history.length > 1) { e.preventDefault(); navigate(-1); } }}>
          &larr; Back to Applications
        </Link>
      </div>

      {error ? (
        <div className="table-card"><div className="state-msg">{error}</div></div>
      ) : (
        <>
          <div className="detail-header">
            {s?.photo && <img className="nri-photo" src={s.photo} alt="Aadhaar" title="Aadhaar photo (DigiLocker)" />}
            <div className="detail-summary">
              <div><span>Account Type</span><strong><span className={`nri-type nri-type--${type}`}>{typeLabel(type)}</span></strong></div>
              <div><span>Unique ID</span><strong>{s ? orNa(s.application_id || s.id) : '…'}</strong></div>
              <div><span>Client Name</span><strong>{s ? orNa(s.client_name) : '…'}</strong></div>
              <div><span>PAN</span><strong>{s ? orNa(s.pan_number) : '…'}</strong></div>
              <div><span>Client Code</span><strong>{s ? orNa(s.client_code) : '…'}</strong></div>
              {s?.current_stage && <div><span>Current Step</span><strong>{formatLabel(s.current_stage)}</strong></div>}
              {s?.status && <div><span>Status</span><strong><StatusPill value={s.status} /></strong></div>}
              {s?.payment_status && <div><span>Payment</span><strong>{formatLabel(s.payment_status)}</strong></div>}
              {s?.esign_status && <div><span>eSign</span><strong>{formatLabel(s.esign_status)}</strong></div>}
              <div><span>BOID</span><strong>{s ? orNa(s.boid) : '…'}</strong></div>
              {s?.mobile_number && <div><span>Mobile</span><strong>{s.mobile_number}</strong></div>}
              {s?.email && <div><span>Email</span><strong>{s.email}</strong></div>}
              {s?.country && <div><span>Residence</span><strong>{s.country}</strong></div>}
              {s?.rm && <div><span>RM</span><strong>{s.rm}</strong></div>}
              {s?.created_at && <div><span>Applied On</span><strong>{formatDateTime(s.created_at)}</strong></div>}
            </div>
          </div>

          {data && (
            <div className="detail-grid">
              <FieldsPanel title={`${typeLabel(type)} Application`} columns={data.columns} record={data.record} />
              <DocumentsPanels sources={sources} />
            </div>
          )}

          {data && (
            <div className="nri-linked">
              <div className="table-card">
                <div className="nri-linked-title">IPV Video Verification <span className="nri-count">{data.ipv.rows.length}</span></div>
                {data.ipv.rows.length === 0 ? (
                  <div className="state-msg">No {typeLabel(type)} IPV session found in nre_nro.{data.ipv.table} for this PAN.</div>
                ) : (
                  <table className="data-table">
                    <thead><tr><th>IPV ID</th><th>Requested</th><th>Call Started</th><th>Duration</th><th>RM</th><th>Status</th><th /></tr></thead>
                    <tbody>
                      {data.ipv.rows.map((r) => (
                        <tr key={r.id}>
                          <td>{orNa(r.id)}</td>
                          <td>{formatDateTime(r.created_at)}</td>
                          <td>{r.started_at ? formatDateTime(r.started_at) : <span className="na">N/A</span>}</td>
                          <td>{duration(r.started_at, r.ended_at) || <span className="na">N/A</span>}</td>
                          <td>{orNa(r.rm)}</td>
                          <td><StatusPill value={r.status} /></td>
                          <td>{r.id && <Link to={`/nri/ipv/${encodeURIComponent(r.id)}`}>Open IPV &rarr;</Link>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="table-card">
                <div className="nri-linked-title">BOID <span className="nri-count">{data.boid.rows.length}</span></div>
                {data.boid.rows.length === 0 ? (
                  <div className="state-msg">No BOID in nre_nro.{data.boid.table} is assigned to this PAN.</div>
                ) : (
                  <div className="nri-table-scroll">
                    <table className="data-table">
                      <thead><tr>{data.boid.columns.map((c) => <th key={c.name}>{fieldLabel(c.name)}</th>)}</tr></thead>
                      <tbody>
                        {data.boid.rows.map((r, i) => (
                          // eslint-disable-next-line react/no-array-index-key
                          <tr key={i}>
                            {data.boid.columns.map((c) => {
                              const v = formatValue(r[c.name], c.type);
                              return <td key={c.name}>{v.na ? <span className="na">N/A</span> : v.text}</td>;
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
