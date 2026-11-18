import { useEffect, useState } from 'react';
import api from '../../api';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../utils/permissions';
import { BoidUpload } from '../Upload';

// NRE - NRO > BOID Numbers: stock of nre_nro.boid_numbers (AVAILABLE = free), its low-stock
// alert limit (same as the KYC Dashboard's BOID), and the BOID upload.
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 };
const REFRESH_MS = 5 * 60 * 1000;
const EDIT_ROLES = ['Super Admin', 'Admin'];

function StatCard({ label, value, color }) {
  return (
    <div className="table-card" style={{ padding: 22 }}>
      <div style={{ color: 'var(--muted)', fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 700, marginTop: 6, color }}>
        {value === null || value === undefined ? '...' : value}
      </div>
    </div>
  );
}

function LimitEditor({ limit, canEdit, onSaved }) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const save = async () => {
    setBusy(true);
    setMessage('');
    try {
      await api.put('/nri/boid/threshold', { value: draft });
      setDraft('');
      setMessage('Saved');
      onSaved();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Could not save the limit');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginTop: 10, fontSize: 13, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span>Alert below {limit}</span>
      {canEdit && (
        <>
          <input
            type="number"
            min="0"
            step="1"
            value={draft}
            placeholder="New limit"
            onChange={(e) => setDraft(e.target.value)}
            style={{ width: 120 }}
            aria-label="New limit for NRI BOID"
          />
          <button type="button" className="button secondary" disabled={busy || draft === ''} onClick={save}>
            {busy ? 'Saving…' : 'Save limit'}
          </button>
          {message && <span>{message}</span>}
        </>
      )}
    </div>
  );
}

export default function NriBoid() {
  const { user } = useAuth();
  const canEditLimit = EDIT_ROLES.includes(user?.role);
  const canUpload = can(user, 'nri', 'edit');
  const [data, setData] = useState(null);

  const load = () => api.get('/nri/boid/summary')
    .then((res) => setData(res.data))
    .catch(() => setData({ error: 'Failed to load' }));

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <Layout title="BOID Numbers">
      {data?.low && (
        <div role="alert" className="nri-low-banner">
          <div className="nri-low-title">Low limit alert</div>
          <div><b>NRI BOID:</b> {data.available} available (limit {data.limit}). Please upload new BOIDs below.</div>
        </div>
      )}

      <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>
        BOID
        {data?.low && <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--danger)' }}>Low stock</span>}
      </h3>
      {data?.error ? (
        <div className="table-card" style={{ padding: 22, color: 'var(--danger)' }}>{data.error}</div>
      ) : (
        <div style={gridStyle}>
          <StatCard label="Total Accounts" value={data?.total} />
          <StatCard label="Used" value={data?.used} color="var(--danger)" />
          <StatCard label="Available" value={data?.available} color={data?.low ? 'var(--danger)' : 'var(--success)'} />
        </div>
      )}
      {data && data.limit !== undefined && <LimitEditor limit={data.limit} canEdit={canEditLimit} onSaved={load} />}

      {canUpload && (
        <div className="nri-boid-upload">
          <BoidUpload endpoint="/nri/boid/upload" onUploaded={load} />
        </div>
      )}
    </Layout>
  );
}
