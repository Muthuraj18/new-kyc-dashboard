import { useEffect, useRef, useState } from 'react';
import { CaretDownIcon } from './icons';

// "Columns" dropdown: search, Select all / Unselect all, and one checkbox per column.
// `columns`: the table's own columns [{ key, label, locked? }] (locked = always shown, not listed).
// `groups` (optional): extra column sections [{ key, label, columns: [{ key, label }] }], shown
//   collapsed under the main list, each with its own select-all; at most `maxExtra` extra
//   columns can be on at once.
// `visible`: Set of shown keys; `onChange(nextSet)`; `defaults`: keys for "Reset to default".
export default function ColumnPicker({ columns, groups = [], maxExtra = Infinity, visible, onChange, defaults }) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const [expanded, setExpanded] = useState({});
  const [note, setNote] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const needle = term.trim().toLowerCase();
  const matches = (c) => !needle || c.label.toLowerCase().includes(needle);
  const choosable = columns.filter((c) => !c.locked);
  const extraKeys = new Set(groups.flatMap((g) => g.columns.map((c) => c.key)));
  const extraOn = [...visible].filter((k) => extraKeys.has(k)).length;
  const shown = choosable.filter((c) => visible.has(c.key)).length + extraOn;
  const total = choosable.length + extraKeys.size;
  const mainAllOn = choosable.every((c) => visible.has(c.key));
  const listed = choosable.filter(matches);

  // Adds keys while keeping the extra-column limit.
  const withKeys = (base, keys) => {
    const next = new Set(base);
    let extra = [...next].filter((k) => extraKeys.has(k)).length;
    let skipped = 0;
    for (const k of keys) {
      if (next.has(k)) continue;
      if (extraKeys.has(k)) {
        if (extra >= maxExtra) { skipped += 1; continue; }
        extra += 1;
      }
      next.add(k);
    }
    setNote(skipped ? `Up to ${maxExtra} extra columns can be shown at once; ${skipped} not added.` : '');
    return next;
  };
  const toggle = (key) => {
    if (visible.has(key)) {
      const next = new Set(visible);
      next.delete(key);
      setNote('');
      onChange(next);
    } else {
      onChange(withKeys(visible, [key]));
    }
  };
  const setMain = (on) => {
    const next = new Set(visible);
    choosable.forEach((c) => { if (on) next.add(c.key); else next.delete(c.key); });
    setNote('');
    onChange(next);
  };
  const setGroup = (g, on) => {
    if (on) { onChange(withKeys(visible, g.columns.filter(matches).map((c) => c.key))); return; }
    const next = new Set(visible);
    g.columns.filter(matches).forEach((c) => next.delete(c.key));
    setNote('');
    onChange(next);
  };

  const item = (c) => (
    <label key={c.key} className="column-picker-item">
      <input type="checkbox" checked={visible.has(c.key)} onChange={() => toggle(c.key)} />
      <span>{c.label}</span>
    </label>
  );

  return (
    <div className="column-picker" ref={ref}>
      <button type="button" className="btn btn-outline" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Columns ({shown}/{total}) <CaretDownIcon className={`ui-icon nav-caret${open ? ' open' : ''}`} />
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
            <input type="checkbox" checked={mainAllOn} onChange={() => setMain(!mainAllOn)} />
            <span>{mainAllOn ? 'Unselect all' : 'Select all'}</span>
          </label>
          {note && <div className="column-picker-note">{note}</div>}
          <div className="column-picker-list">
            {listed.map(item)}
            {groups.map((g) => {
              const inGroup = g.columns.filter(matches);
              if (needle && !inGroup.length) return null;
              const on = g.columns.filter((c) => visible.has(c.key)).length;
              const isOpen = needle ? true : !!expanded[g.key];
              const allOn = inGroup.length > 0 && inGroup.every((c) => visible.has(c.key));
              return (
                <div key={g.key} className="column-picker-group">
                  <div className="column-picker-group-head">
                    <input
                      type="checkbox"
                      checked={allOn}
                      aria-label={`${allOn ? 'Unselect' : 'Select'} all ${g.label} columns`}
                      onChange={() => setGroup(g, !allOn)}
                    />
                    <button type="button" onClick={() => setExpanded((x) => ({ ...x, [g.key]: !x[g.key] }))}>
                      <span>{g.label}</span>
                      <small>{on}/{g.columns.length}</small>
                      <CaretDownIcon className={`ui-icon nav-caret${isOpen ? ' open' : ''}`} />
                    </button>
                  </div>
                  {isOpen && <div className="column-picker-group-list">{inGroup.map(item)}</div>}
                </div>
              );
            })}
            {!listed.length && !groups.some((g) => g.columns.some(matches)) && <div className="column-picker-empty">No columns match.</div>}
          </div>
          {defaults && (
            <button type="button" className="link-btn column-picker-reset" onClick={() => { setNote(''); onChange(new Set(defaults)); }}>
              Reset to default
            </button>
          )}
        </div>
      )}
    </div>
  );
}
