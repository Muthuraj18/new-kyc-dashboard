import { useEffect, useRef, useState } from 'react';
import { CaretDownIcon } from './icons';

// "Columns" dropdown: search, Select all / Unselect all, and one checkbox per column.
// `columns`: [{ key, label, locked? }] (locked columns are always shown and not listed).
// `visible`: Set of shown keys; `onChange(nextSet)`.
export default function ColumnPicker({ columns, visible, onChange, defaults }) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const choosable = columns.filter((c) => !c.locked);
  const shown = choosable.filter((c) => visible.has(c.key)).length;
  const allOn = shown === choosable.length;
  const listed = choosable.filter((c) => c.label.toLowerCase().includes(term.trim().toLowerCase()));

  const toggle = (key) => {
    const next = new Set(visible);
    if (next.has(key)) next.delete(key); else next.add(key);
    onChange(next);
  };
  const setAll = (on) => {
    const next = new Set(columns.filter((c) => c.locked).map((c) => c.key));
    if (on) choosable.forEach((c) => next.add(c.key));
    onChange(next);
  };

  return (
    <div className="column-picker" ref={ref}>
      <button type="button" className="btn btn-outline" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Columns ({shown}/{choosable.length}) <CaretDownIcon className={`ui-icon nav-caret${open ? ' open' : ''}`} />
      </button>
      {open && (
        <div className="column-picker-menu" role="dialog" aria-label="Choose columns">
          <input
            type="text"
            className="column-picker-search"
            placeholder="Search…"
            value={term}
            autoFocus
            onChange={(e) => setTerm(e.target.value)}
          />
          <label className="column-picker-item column-picker-all">
            <input type="checkbox" checked={allOn} onChange={() => setAll(!allOn)} />
            <span>{allOn ? 'Unselect all' : 'Select all'}</span>
          </label>
          <div className="column-picker-list">
            {listed.map((c) => (
              <label key={c.key} className="column-picker-item">
                <input type="checkbox" checked={visible.has(c.key)} onChange={() => toggle(c.key)} />
                <span>{c.label}</span>
              </label>
            ))}
            {!listed.length && <div className="column-picker-empty">No columns match.</div>}
          </div>
          {defaults && (
            <button type="button" className="link-btn column-picker-reset" onClick={() => onChange(new Set(defaults))}>
              Reset to default
            </button>
          )}
        </div>
      )}
    </div>
  );
}
