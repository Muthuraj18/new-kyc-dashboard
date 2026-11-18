import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { BellIcon } from './icons';

const REFRESH_MS = 5 * 60 * 1000;
// `to`: where clicking the alert goes. nriBoid is only in the summary for NRE - NRO users.
const ITEMS = [
  { key: 'stampPaper', label: 'Stamp Paper', to: '/dashboard' },
  { key: 'boid', label: 'BOID', to: '/dashboard' },
  { key: 'nriBoid', label: 'NRI BOID', to: '/nri/boid' },
  { key: 'razorpayFee', label: 'Razorpay fee credit', to: '/dashboard' },
];
const rupees = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v);

// Current value and limit for one item, as shown in the bell (limits come from the Dashboard).
const detail = (item) => {
  if (item.key === 'razorpayFee') return `${rupees(item.feeCreditsRupees)} (limit ${rupees(item.limit)})`;
  return `${item.available} available (limit ${item.limit})`;
};

// Topbar bell: low-limit alerts for Stamp Paper, BOID and (Super Admin and Admin) the Razorpay fee credit.
// Uses the same limits as the Dashboard banner. Dismissing the banner does not hide this.
export default function NotificationBell() {
  const navigate = useNavigate();
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const load = () => api.get('/inventory/summary').then((res) => setSummary(res.data)).catch(() => {});
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const alerts = summary ? ITEMS.filter((i) => summary[i.key]?.low) : [];

  return (
    <div className="notif-wrap" ref={ref}>
      <button
        className="notif-btn"
        aria-label={`Notifications${alerts.length ? ` (${alerts.length})` : ''}`}
        onClick={() => setOpen((o) => !o)}
      >
        <BellIcon />
        {alerts.length > 0 && <span className="notif-badge">{alerts.length}</span>}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-head">Notifications</div>
          {alerts.length ? (
            alerts.map((i) => (
              <button
                key={i.key}
                className="notif-item"
                onClick={() => { setOpen(false); navigate(i.to); }}
              >
                <span className="notif-dot" />
                <span>
                  <b>Below limit: {i.label}</b>
                  <span className="notif-text">
                    Now {detail({ key: i.key, ...summary[i.key] })}. Please act.
                  </span>
                </span>
              </button>
            ))
          ) : (
            <div className="notif-empty">
              No new notifications
              {summary && (
                <span className="notif-text">
                  {ITEMS.filter((i) => summary[i.key] && !summary[i.key].error)
                    .map((i) => `${i.label}: ${detail({ key: i.key, ...summary[i.key] })}`)
                    .join(' · ')}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
