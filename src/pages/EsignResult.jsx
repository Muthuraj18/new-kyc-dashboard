import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import api from '../api';
import Layout from '../components/Layout';
import { orNa } from '../utils/format';

// PRE KYC - d: Setu sends the KYC team here after the client signs (/clients/:id/esign-result).
// The eSign status check makes the onboarding API save the signed PDF to S3
// (Client/pre-kyc-dubai/esigned_pdf/), email it to the client, and mark the client esigned;
// the dashboard then pushes the data to CVL KRA, CDSL, NSE, BSE, MF and TechExcel.
const STATUS_TEXT = {
  completed: 'eSign completed',
  pending: 'Not signed yet',
  failed: 'eSign failed',
  name_mismatch: 'Signer name does not match',
  not_started: 'eSign not started',
};

export default function EsignResult() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const [state, setState] = useState({ loading: true }); // { loading } | { error } | { result }
  const [exportsBusy, setExportsBusy] = useState(false);
  const started = useRef(false);
  // Setu adds success=false when the signer cancels or the eSign fails.
  const declined = params.get('success') === 'false';

  const check = async () => {
    setState({ loading: true });
    try {
      const { data } = await api.post(`/clients/${id}/esign-status`);
      setState({ result: data.data });
    } catch (err) {
      setState({ error: err.response?.data?.error || 'Could not check the eSign status' });
    }
  };

  const rerunExports = async () => {
    setExportsBusy(true);
    try {
      const { data } = await api.post(`/clients/${id}/exports`);
      setState((s) => ({ result: { ...s.result, exports: data.data, client: data.data.client || s.result.client } }));
    } catch (err) {
      setState((s) => ({ result: { ...s.result, exportsError: err.response?.data?.error || 'Could not run the exports' } }));
    } finally {
      setExportsBusy(false);
    }
  };

  useEffect(() => {
    if (started.current) return; // once (React StrictMode runs effects twice in dev)
    started.current = true;
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const r = state.result;
  const done = r?.status === 'completed';
  const exportsList = r?.exports?.results || [];

  return (
    <Layout title="eSign Result">
      <div className="detail-back">
        <Link to={`/clients/${id}`}>&larr; Back to client</Link>
      </div>

      <div className="table-card dl-result">
        {state.loading && <div className="state-msg">Checking the eSign with Setu…</div>}

        {state.error && (
          <div className="dl-result-error">
            <strong>eSign status not available</strong>
            <span>{state.error}</span>
            <div className="dl-result-actions">
              <button className="btn btn-blue" onClick={check}>Check again</button>
              <Link className="btn btn-outline" to={`/clients/${id}`}>Back to client</Link>
            </div>
          </div>
        )}

        {r && (
          <>
            <div className="dl-result-head">
              <div>
                <span className={`${done ? 'flow-ok' : 'flow-pending'} dl-result-badge`}>{STATUS_TEXT[r.status] || r.status}</span>
                <h2>{orNa(r.client?.client_name)}</h2>
                <span className="dl-result-sub">
                  Unique ID {orNa(r.client?.unique_id)} · PAN {orNa(r.client?.pan_number)} · Client Code {orNa(r.client?.client_code)}
                </span>
              </div>
            </div>

            <p className="esign-result-msg">{r.message}</p>
            {!done && declined && <p className="esign-result-msg">Setu reported that the eSign was cancelled or failed.</p>}

            {done && (
              <>
                <div className="dl-result-xml ok">
                  <strong>Signed PDF</strong>
                  <span>Stored in S3 (Client/pre-kyc-dubai/esigned_pdf/) and emailed to {orNa(r.client?.email)}.</span>
                </div>

                <h3 className="esign-result-h3">Data pushed to</h3>
                {exportsList.length ? (
                  <ul className="esign-exports">
                    {exportsList.map((x) => (
                      <li key={x.key} className={x.ok ? 'ok' : 'fail'}>
                        <strong>{x.ok ? '✓' : '✗'} {x.label}</strong>
                        <span>{x.message}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="esign-result-msg">{r.exportsError || 'The exports have not run yet.'}</p>
                )}
              </>
            )}

            <div className="dl-result-actions">
              {!done && <button className="btn btn-blue" onClick={check}>Check again</button>}
              {done && exportsList.some((x) => !x.ok) && (
                <button className="btn btn-blue" disabled={exportsBusy} onClick={rerunExports}>
                  {exportsBusy ? 'Running exports…' : 'Retry failed exports'}
                </button>
              )}
              {done && !exportsList.length && (
                <button className="btn btn-blue" disabled={exportsBusy} onClick={rerunExports}>
                  {exportsBusy ? 'Running exports…' : 'Run exports'}
                </button>
              )}
              <Link className="btn btn-outline" to={`/clients/${id}`}>Continue to client</Link>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
