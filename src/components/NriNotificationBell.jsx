import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { BellIcon } from './icons';

// Topbar bell on the NRE - NRO pages: only the NRI BOID low-stock alert
// (nre_nro.boid_numbers, limit NRI_BOID_ALERT_LIMIT). The KYC pages keep their own bell.
const REFRESH_MS = 5 * 60 * 1000;

export default function NriNotificationBell() {
  const navigate = useNavigate();
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [boid, setBoid] = useState(null);

  useEffect(() => {
    const load = () => api.get('/nri/boid/summary').then((res) => setBoid(res.data)).catch(() => {});
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const low = !!boid?.low;

  return (
    <div className="notif-wrap" ref={ref}>
      <button className="notif-btn" aria-label={`Notifications${low ? ' (1)' : ''}`} onClick={() => setOpen((o) => !o)}>
        <BellIcon />
        {low && <span className="notif-badge">1</span>}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="notif-head">Notifications</div>
          {low ? (
            <button className="notif-item" onClick={() => { setOpen(false); navigate('/nri/boid'); }}>
              <span className="notif-dot" />
              <span>
                <b>Below limit: NRI BOID</b>
                <span className="notif-text">Now {boid.available} available (limit {boid.limit}). Please act.</span>
              </span>
            </button>
          ) : (
            <div className="notif-empty">
              No new notifications
              {boid && !boid.error && (
                <span className="notif-text">NRI BOID: {boid.available} available (limit {boid.limit})</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
