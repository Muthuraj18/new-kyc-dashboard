import { useEffect, useState } from 'react';
import api from '../api';
import Layout from '../components/Layout';

export default function Dashboard() {
  const [stats, setStats] = useState({ total: null, completed: null, inProgress: null });

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
  }, []);

  const cards = [
    { label: 'Total Applications', value: stats.total },
    { label: 'Completed', value: stats.completed },
    { label: 'In Progress', value: stats.inProgress },
  ];

  return (
    <Layout title="Dashboard">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {cards.map((c) => (
          <div key={c.label} className="table-card" style={{ padding: 22 }}>
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>{c.label}</div>
            <div style={{ fontSize: 30, fontWeight: 700, marginTop: 6 }}>
              {c.value === null ? '...' : c.value}
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
