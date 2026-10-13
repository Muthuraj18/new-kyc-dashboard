import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { BellIcon } from './icons';

const REFRESH_MS = 5 * 60 * 1000;
const ITEMS = [
  { key: 'stampPaper', label: 'Stamp Paper' },
  { key: 'boid', label: 'BOID' },
];

// Topbar bell: low-stock alerts for BOID / Stamp Paper (same data as the Dashboard cards).
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
                onClick={() => { setOpen(false); navigate('/dashboard'); }}
              >
                <span className="notif-dot" />
                <span>
                  <b>Low {i.label} stock</b>
                  <span className="notif-text">
                    Only {summary[i.key].available} available (alert below {summary.threshold}). Please replenish.
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
                    .map((i) => `${i.label}: ${summary[i.key].available} available`)
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
