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
      <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>{title}</h3>
      {data?.error ? (
        <div className="table-card" style={{ padding: 22, color: 'var(--danger)' }}>{data.error}</div>
      ) : (
        <div style={gridStyle}>
          <StatCard label="Total Accounts" value={data?.total} />
          <StatCard label="Used" value={data?.used} color="var(--danger)" />
          <StatCard label="Available" value={data?.available} color="var(--success)" />
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({ total: null, completed: null, inProgress: null });
  const [inventory, setInventory] = useState({ stampPaper: null, boid: null });

  useEffect(() => {
    Promise.all([
      api.get('/clients', { params: { pageSize: 1 } }),
      api.get('/clients', { params: { pageSize: 1, status: 'completed' } }),
      api.get('/clients', { params: { pageSize: 1, status: 'in_progress' } }),
    ])
      .then(([all, completed, inProgress]) => {
        setStats({
          total: all.data.total,
          completed: completed.data.total,
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
    { label: 'In Progress', value: stats.inProgress },
  ];

  return (
    <Layout title="Dashboard">
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
