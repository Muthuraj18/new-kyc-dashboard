import { useEffect, useState } from 'react';
import api from '../../api';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../utils/permissions';
import NriBoidUpload from '../../components/NriBoidUpload';

// NRE - NRO > BOID Numbers: stock of nre_nro.boid_numbers (AVAILABLE = free), its low-stock
// alert (limit = NRI_BOID_ALERT_LIMIT on the Lambda, default 25), and the BOID upload.
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 };
const REFRESH_MS = 5 * 60 * 1000;

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

export default function NriBoid() {
  const { user } = useAuth();
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
      {data && data.limit !== undefined && (
        <div style={{ marginTop: 10, fontSize: 13, color: 'var(--muted)' }} title="Set NRI_BOID_ALERT_LIMIT on the Lambda to change it">
          Alert below {data.limit}
        </div>
      )}

      {canUpload && (
        <div className="nri-boid-upload">
          <NriBoidUpload onUploaded={load} />
        </div>
      )}
    </Layout>
  );
}
