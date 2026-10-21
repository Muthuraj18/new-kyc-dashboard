import { useEffect, useState } from 'react';
import api from '../api';
import Layout from '../components/Layout';

const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 };

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

function InventorySection({ title, data }) {
  return (
    <div style={{ marginTop: 28 }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>
        {title}
        {data?.low && <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--danger)' }}>Low stock</span>}
      </h3>
      {data?.error ? (
        <div className="table-card" style={{ padding: 22, color: 'var(--danger)' }}>{data.error}</div>
      ) : (
        <div style={gridStyle}>
          <StatCard label="Total Accounts" value={data?.total} />
          <StatCard label="Used" value={data?.used} color="var(--danger)" />
          <StatCard
            label="Available"
            value={data?.available}
            color={data?.low ? 'var(--danger)' : 'var(--success)'}
          />
        </div>
      )}
    </div>
  );
}

// Shown when available BOID or Stamp Paper stock is below the alert threshold.
function LowStockAlert({ inventory }) {
  const low = [
    { label: 'Stamp Paper', data: inventory.stampPaper },
    { label: 'BOID', data: inventory.boid },
  ].filter((i) => i.data?.low);
  if (!low.length) return null;

  return (
    <div
      role="alert"
      style={{
        marginBottom: 20,
        padding: '14px 18px',
        borderRadius: 10,
        border: '1px solid var(--danger)',
        borderLeftWidth: 5,
        background: 'var(--card-bg)',
      }}
    >
      <div style={{ fontWeight: 700, color: 'var(--danger)' }}>Low inventory alert</div>
      <div style={{ marginTop: 4, fontSize: 14 }}>
        {low.map((i) => `${i.label}: only ${i.data.available} available`).join(' · ')}
        {` (alert below ${inventory.threshold}). Please replenish the stock.`}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({ total: null, completed: null, verify: null, inProgress: null });
  const [inventory, setInventory] = useState({ stampPaper: null, boid: null });

  // Same calculated status as the Clients list filter (Completed / Verify / In Progress
  // don't overlap), not the stored kyc_status flag.
  useEffect(() => {
    Promise.all([
      api.get('/clients', { params: { pageSize: 1 } }),
      api.get('/clients', { params: { pageSize: 1, dashboardStatus: 'completed' } }),
      api.get('/clients', { params: { pageSize: 1, dashboardStatus: 'verify' } }),
      api.get('/clients', { params: { pageSize: 1, dashboardStatus: 'in_progress' } }),
    ])
      .then(([all, completed, verify, inProgress]) => {
        setStats({
          total: all.data.total,
          completed: completed.data.total,
          verify: verify.data.total,
          inProgress: inProgress.data.total,
        });
      })
      .catch(() => {});

    api.get('/inventory/summary')
      .then((res) => setInventory(res.data))
      .catch(() => {
        const error = 'Failed to load';
        setInventory({ stampPaper: { error }, boid: { error } });
      });
  }, []);

  const cards = [
    { label: 'Total Applications', value: stats.total },
    { label: 'Completed', value: stats.completed },
    { label: 'Verify', value: stats.verify },
    { label: 'In Progress', value: stats.inProgress },
  ];

  return (
    <Layout title="Dashboard">
      <LowStockAlert inventory={inventory} />

      <div style={gridStyle}>
        {cards.map((c) => (
          <StatCard key={c.label} label={c.label} value={c.value} />
        ))}
      </div>

      <InventorySection title="Stamp Paper" data={inventory.stampPaper} />
      <InventorySection title="BOID" data={inventory.boid} />
    </Layout>
  );
}
