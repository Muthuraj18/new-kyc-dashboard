import { useEffect, useRef, useState } from 'react';
import { GearIcon } from './icons';

export default function ActionsMenu({ onView, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="actions-wrap" ref={ref}>
      <button className="btn btn-outline btn-sm" onClick={() => setOpen((o) => !o)}>
        <GearIcon /> Actions
      </button>
      {open && (
        <div className="actions-menu">
          <button onClick={() => { setOpen(false); onView(); }}>View Details</button>
          <button onClick={() => { setOpen(false); onEdit(); }}>Edit</button>
          {onDelete && (
            <button onClick={() => { setOpen(false); onDelete(); }} style={{ color: 'var(--danger)' }}>
              Move to Trash
            </button>
          )}
        </div>
      )}
    </div>
  );
}
