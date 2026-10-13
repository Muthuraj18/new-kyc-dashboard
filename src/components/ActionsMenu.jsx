import { useEffect, useRef, useState } from 'react';
import { GearIcon } from './icons';

// onSkipPayment / onDelete are optional: pass them only when the action applies.
export default function ActionsMenu({ onView, onEdit, onSkipPayment, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const run = (fn) => () => { setOpen(false); fn(); };

  return (
    <div className="actions-wrap" ref={ref}>
      <button className="btn btn-outline btn-sm" onClick={() => setOpen((o) => !o)}>
        <GearIcon /> Actions
      </button>
      {open && (
        <div className="actions-menu">
          <button onClick={run(onView)}>View Details</button>
          <button onClick={run(onEdit)}>Edit</button>
          {onSkipPayment && <button onClick={run(onSkipPayment)}>Skip Payment Stage</button>}
          {onDelete && (
            <button onClick={run(onDelete)} style={{ color: 'var(--danger)' }}>
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
