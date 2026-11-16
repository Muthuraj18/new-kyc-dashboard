import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import api from '../api';
import Layout from '../components/Layout';
import { orNa } from '../utils/format';

// PRE KYC - d eSign result (/clients/:id/esign-result).
// Start Esign flow opens Setu's signing page in a new tab and brings this tab here with
// ?waiting=1: the page checks the eSign status every few seconds until the client has signed.
// (If Setu itself returns here after signing, the first check already shows the result.)
// Once signed, the onboarding API saves the signed PDF to S3 and emails it to the client, and
// the dashboard pushes the data to CVL KRA, CDSL, NSE, BSE, MF and TechExcel.
const STATUS_TEXT = {
  completed: 'eSign completed',
  pending: 'Waiting for the client to sign',
  failed: 'eSign failed',
  name_mismatch: 'Signer name does not match',
  not_started: 'eSign not started',
};
const POLL_MS = 6000;
const POLL_FOR_MS = 20 * 60 * 1000; // stop checking automatically after 20 minutes
const FINAL = ['completed', 'failed', 'name_mismatch'];

export default function EsignResult() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { state: navState } = useLocation();
  const signingUrl = navState?.signingUrl || null;
  const waitingMode = params.get('waiting') === '1';
  const declined = params.get('success') === 'false';

  const [state, setState] = useState({ loading: true }); // { loading } | { error } | { result }
  const [polling, setPolling] = useState(waitingMode);
  const [exportsBusy, setExportsBusy] = useState(false);
  const started = useRef(false);
  const startedAt = useRef(Date.now());
  const inFlight = useRef(false);

  const check = async ({ quiet = false } = {}) => {
    if (inFlight.current) return;
    inFlight.current = true;
    if (!quiet) setState({ loading: true });
    try {
      const { data } = await api.post(`/clients/${id}/esign-status`);
      setState({ result: data.data });
      if (FINAL.includes(data.data.status)) setPolling(false);
    } catch (err) {
      if (!quiet) setState({ error: err.response?.data?.error || 'Could not check the eSign status' });
    } finally {
      inFlight.current = false;
    }
  };

  useEffect(() => {
    if (started.current) return; // once (React StrictMode runs effects twice in dev)
    started.current = true;
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Waiting for the signature: check again every few seconds.
  useEffect(() => {
    if (!polling) return undefined;
    const timer = setInterval(() => {
      if (Date.now() - startedAt.current > POLL_FOR_MS) { setPolling(false); return; }
      check({ quiet: true });
    }, POLL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polling, id]);

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

  const r = state.result;
  const done = r?.status === 'completed';
  const waiting = r && !FINAL.includes(r.status);
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
              <button className="btn btn-blue" onClick={() => check()}>Check again</button>
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

            {waiting ? (
              <div className="esign-waiting">
                {polling && <span className="esign-spinner" aria-hidden="true" />}
                <div>
                  <strong>{polling ? 'Waiting for the signature…' : 'Not signed yet.'}</strong>
                  <span>
                    {signingUrl
                      ? 'Setu eSign is open in another tab. The client signs there with Aadhaar OTP; this page updates by itself once they have signed. You can close the other tab afterwards.'
                      : 'Once the client has signed on Setu, this page shows the result.'}
                  </span>
                  {!polling && <span>Click Check again after the client has signed.</span>}
                </div>
              </div>
            ) : (
              <p className="esign-result-msg">{r.message}</p>
            )}
            {!done && declined && <p className="esign-result-msg">Setu reported that the eSign was cancelled or failed.</p>}

            {done && (
              <>
                <div className="dl-result-xml ok">
                  <strong>Signed PDF</strong>
                  <span>Stored in S3 and emailed to {orNa(r.client?.email)}.</span>
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
              {waiting && signingUrl && (
                <a className="btn btn-blue" href={signingUrl} target="_blank" rel="noreferrer">Open Setu eSign page</a>
              )}
              {waiting && <button className="btn btn-outline" onClick={() => check()}>Check again</button>}
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
              <Link className="btn btn-outline" to={`/clients/${id}`}>{done ? 'Continue to client' : 'Back to client'}</Link>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
