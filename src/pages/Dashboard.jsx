import { useEffect, useState } from 'react';
import api from '../api';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 };
// Matches the topbar bell. The server caches the Razorpay balance for the same 5 minutes.
const REFRESH_MS = 5 * 60 * 1000;
const EDIT_ROLES = ['Super Admin', 'Admin'];
const FEE_ROLES = ['Super Admin', 'Admin'];
const DISMISS_KEY = (userId) => `kyc_low_limit_dismissed:${userId}`;
const formatRupees = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);

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

// Edits one metric's low limit. Only Super Admin and Admin see the Save control.
function LimitEditor({ metric, limit, unit, canEdit, onSaved }) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const save = async () => {
    setBusy(true);
    setMessage('');
    try {
      await api.put(`/inventory/thresholds/${metric}`, { value: draft });
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
      <span>Alert below {unit === 'rupees' ? formatRupees(limit) : limit}</span>
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
            aria-label={`New limit for ${metric}`}
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

function InventorySection({ title, metric, data, canEdit, onSaved }) {
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
      {data && !data.error && data.limit !== undefined && (
        <LimitEditor metric={metric} limit={data.limit} unit="count" canEdit={canEdit} onSaved={onSaved} />
      )}
    </div>
  );
}

// Razorpay fee credit (Super Admin and Admin). Shows the amount, when it was read, and Razorpay's
// own last-update time.
function FeeCreditSection({ data, canEdit, onSaved }) {
  const error = data?.error;
  return (
    <div style={{ marginTop: 28 }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Razorpay Fee Credit</h3>
      {error ? (
        <div className="table-card" style={{ padding: 22, color: 'var(--danger)' }}>{error}</div>
      ) : (
        <div style={gridStyle}>
          <StatCard
            label="Fee credit"
            value={data?.feeCreditsRupees !== undefined ? formatRupees(data.feeCreditsRupees) : null}
            color={data?.low ? 'var(--danger)' : 'var(--success)'}
          />
          <div className="table-card" style={{ padding: 22, fontSize: 13, color: 'var(--muted)' }}>
            <div>Read from Razorpay at {data?.fetchedAt ? new Date(data.fetchedAt).toLocaleTimeString('en-IN') : '...'}</div>
            <div style={{ marginTop: 6 }}>
              Razorpay last updated: {data?.razorpayUpdatedAt ? new Date(data.razorpayUpdatedAt).toLocaleString('en-IN') : 'N/A'}
            </div>
          </div>
        </div>
      )}
      {data && data.limit !== undefined && (
        <LimitEditor metric="razorpayFee" limit={data.limit} unit="rupees" canEdit={canEdit} onSaved={onSaved} />
      )}
    </div>
  );
}

// Heavy banner for every metric under its limit. X hides it until the next login.
function LowLimitBanner({ inventory, onDismiss }) {
  const low = [
    inventory.stampPaper?.low && { label: 'Stamp Paper', text: `${inventory.stampPaper.available} available (limit ${inventory.stampPaper.limit})` },
    inventory.boid?.low && { label: 'BOID', text: `${inventory.boid.available} available (limit ${inventory.boid.limit})` },
    inventory.razorpayFee?.low && { label: 'Razorpay fee credit', text: `${formatRupees(inventory.razorpayFee.feeCreditsRupees)} (limit ${formatRupees(inventory.razorpayFee.limit)})` },
  ].filter(Boolean);
  if (!low.length) return null;

  return (
    <div
      role="alert"
      style={{
        marginBottom: 20,
        padding: '16px 46px 16px 18px',
        borderRadius: 10,
        border: '2px solid var(--danger)',
        borderLeftWidth: 8,
        background: 'var(--card-bg)',
        position: 'relative',
      }}
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Close low limit alert"
        style={{ position: 'absolute', top: 10, right: 12, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted)' }}
      >
        ×
      </button>
      <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--danger)' }}>Low limit alert</div>
      <ul style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 14 }}>
        {low.map((i) => (
          <li key={i.label}><b>{i.label}:</b> {i.text}</li>
        ))}
      </ul>
      <div style={{ marginTop: 8, fontSize: 13, color: 'var(--muted)' }}>This alert returns at your next login.</div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const canEdit = EDIT_ROLES.includes(user?.role);
  const canSeeFee = FEE_ROLES.includes(user?.role);
  const [stats, setStats] = useState({ total: null, completed: null, verify: null, inProgress: null });
  const [inventory, setInventory] = useState({ stampPaper: null, boid: null, razorpayFee: null });
  const [dismissed, setDismissed] = useState(() => {
    try { return user?.id ? localStorage.getItem(DISMISS_KEY(user.id)) === '1' : false; } catch { return false; }
  });

  const dismiss = () => {
    try { if (user?.id) localStorage.setItem(DISMISS_KEY(user.id), '1'); } catch { /* storage unavailable */ }
    setDismissed(true);
  };

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
  }, []);

  // Stock, limits and (for Super Admin and Admin) the Razorpay fee credit, refreshed every 5 minutes.
  const loadInventory = () => api.get('/inventory/summary')
    .then((res) => setInventory(res.data))
    .catch(() => {
      const error = 'Failed to load';
      setInventory({ stampPaper: { error }, boid: { error }, razorpayFee: canSeeFee ? { error } : null });
    });

  useEffect(() => {
    loadInventory();
    const timer = setInterval(loadInventory, REFRESH_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSeeFee]);

  const cards = [
    { label: 'Total Applications', value: stats.total },
    { label: 'Completed', value: stats.completed },
    { label: 'Verify', value: stats.verify },
    { label: 'In Progress', value: stats.inProgress },
  ];

  return (
    <Layout title="Dashboard">
      {!dismissed && <LowLimitBanner inventory={inventory} onDismiss={dismiss} />}

      <div style={gridStyle}>
        {cards.map((c) => (
          <StatCard key={c.label} label={c.label} value={c.value} />
        ))}
      </div>

      <InventorySection title="Stamp Paper" metric="stampPaper" data={inventory.stampPaper} canEdit={canEdit} onSaved={loadInventory} />
      <InventorySection title="BOID" metric="boid" data={inventory.boid} canEdit={canEdit} onSaved={loadInventory} />
      {canSeeFee && <FeeCreditSection data={inventory.razorpayFee} canEdit={canEdit} onSaved={loadInventory} />}
    </Layout>
  );
}
