import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import api from '../api';
import Layout from '../components/Layout';
import { orNa } from '../utils/format';

// PRE KYC - d: Setu sends the KYC team here after the client approves DigiLocker
// (/clients/:id/digilocker-result). The page fetches the Aadhaar data, stores the signed
// Aadhaar XML in S3 and shows what was saved, one box per field, grouped in sections.
const SECTIONS = [
  {
    title: 'Personal details',
    fields: [
      { label: 'Name', key: 'digilocker_name' },
      { label: 'Father Name', key: 'digilocker_father_name' },
      { label: 'Gender', key: 'digilocker_gender' },
      { label: 'Date of Birth', key: 'digilocker_dob' },
      { label: 'Aadhaar Number', key: 'digilocker_aadhaar_number_masked', mono: true },
    ],
  },
  {
    title: 'Address',
    fields: [
      { label: 'Address', key: 'digilocker_address', wide: true },
      { label: 'City', key: 'digilocker_city' },
      { label: 'District', key: 'digilocker_district' },
      { label: 'State', key: 'digilocker_state' },
      { label: 'Pincode', key: 'digilocker_pincode', mono: true },
    ],
  },
];

const photoSrc = (v) => (String(v).startsWith('data:') ? v : `data:image/jpeg;base64,${v}`);

export default function DigilockerResult() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const [state, setState] = useState({ loading: true }); // { loading } | { error } | { result }
  const started = useRef(false);
  // Setu adds success=false (and an error code) when the client cancels or DigiLocker fails.
  const declined = params.get('success') === 'false';

  const fetchResult = async () => {
    setState({ loading: true });
    try {
      const { data } = await api.post(`/clients/${id}/digilocker/fetch`);
      setState({ result: data.data });
    } catch (err) {
      setState({ error: err.response?.data?.error || 'Could not fetch the DigiLocker data' });
    }
  };

  useEffect(() => {
    if (started.current) return; // fetch once (React StrictMode runs effects twice in dev)
    started.current = true;
    if (declined) setState({ error: `DigiLocker was not completed${params.get('errCode') ? ` (${params.get('errCode')})` : ''}. Start DigiLocker again from the client page.` });
    else fetchResult();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const r = state.result;
  const d = r?.clientDetails || {};

  return (
    <Layout title="DigiLocker Result">
      <div className="detail-back">
        <Link to={`/clients/${id}`}>&larr; Back to client</Link>
      </div>

      <div className="table-card dl-result">
        {state.loading && <div className="state-msg">Fetching the Aadhaar data and XML from DigiLocker…</div>}

        {state.error && (
          <div className="dl-result-error">
            <strong>DigiLocker data not fetched</strong>
            <span>{state.error}</span>
            <div className="dl-result-actions">
              {!declined && <button className="btn btn-blue" onClick={fetchResult}>Try again</button>}
              <Link className="btn btn-outline" to={`/clients/${id}`}>Back to client</Link>
            </div>
          </div>
        )}

        {r && (
          <>
            <div className="dlr-hero">
              <div className="dlr-photo">
                {d.digilocker_photo_base64
                  ? <img src={photoSrc(d.digilocker_photo_base64)} alt="Aadhaar photo" />
                  : <span>No photo</span>}
              </div>
              <div className="dlr-hero-text">
                <span className="dlr-badge">✓ DigiLocker completed</span>
                <h2>{orNa(d.digilocker_name || r.details?.name)}</h2>
                <div className="dlr-chips">
                  <span><em>Unique ID</em>{orNa(r.client?.unique_id)}</span>
                  <span><em>PAN</em>{orNa(r.client?.pan_number)}</span>
                  <span><em>KYC Type</em>{orNa(r.client?.kyc_type)}</span>
                </div>
              </div>
            </div>

            {SECTIONS.map((s) => (
              <section key={s.title} className="dlr-section">
                <h3>{s.title}</h3>
                <div className="dlr-boxes">
                  {s.fields.map((f) => (
                    <div key={f.key} className={`dlr-box${f.wide ? ' wide' : ''}`}>
                      <span>{f.label}</span>
                      <strong className={f.mono ? 'mono' : ''}>{orNa(d[f.key])}</strong>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            <section className="dlr-section">
              <h3>Aadhaar XML</h3>
              <div className={`dlr-xml ${r.xml?.saved ? 'ok' : 'warn'}`}>
                <span className="dlr-xml-icon" aria-hidden="true">{r.xml?.saved ? '✓' : '!'}</span>
                <div>
                  <strong>{r.xml?.saved ? 'Stored in S3' : 'Not stored'}</strong>
                  {r.xml?.saved
                    ? <span className="mono">{r.xml.key}</span>
                    : <span>{r.xml?.error || 'DigiLocker returned no XML.'}</span>}
                </div>
              </div>
            </section>

            <div className="dl-result-actions">
              <Link className="btn btn-blue" to={`/clients/${id}`}>Continue to client</Link>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
