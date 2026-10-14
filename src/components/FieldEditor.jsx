import { useEffect, useRef, useState } from 'react';

// Inline editor for one Client Details field. `def` comes from GET /clients/edit-fields.
// The backend validates again; this only gives the right input for the field type.
const INPUT_TYPE = { email: 'email', mobile: 'tel', date: 'date', percent: 'number', pincode: 'text', micr: 'text' };

export default function FieldEditor({ def, value, onApply, onCancel }) {
  const toInput = (v) => {
    if (def.type === 'bool') return v === true ? 'true' : v === false ? 'false' : '';
    return v === null || v === undefined ? '' : String(v);
  };
  const [draft, setDraft] = useState(toInput(value));
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);

  const apply = () => {
    const v = def.type === 'bool' ? (draft === '' ? null : draft === 'true') : draft;
    onApply(v);
  };
  const onKey = (e) => {
    if (e.key === 'Enter' && def.type !== 'text') apply();
    if (e.key === 'Escape') onCancel();
  };

  let input;
  if (def.type === 'select' || def.type === 'bool') {
    const options = def.type === 'bool' ? [['true', 'Yes'], ['false', 'No']] : def.options.map((o) => [o, o]);
    // Keep an older saved value selectable even if it's not one of today's options.
    const legacy = def.type === 'select' && draft && !def.options.includes(draft);
    input = (
      <select ref={ref} className="field-input" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey}>
        <option value="">{def.required ? 'Select…' : '(empty)'}</option>
        {legacy && <option value={draft} disabled>{draft} (old value)</option>}
        {options.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
      </select>
    );
  } else if (def.type === 'text' && def.max > 255) {
    input = (
      <textarea ref={ref} className="field-input" rows={3} maxLength={def.max} value={draft}
        onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} />
    );
  } else {
    input = (
      <input
        ref={ref}
        className="field-input"
        type={INPUT_TYPE[def.type] || 'text'}
        value={draft}
        maxLength={def.max || undefined}
        step={def.type === 'percent' ? '0.01' : undefined}
        min={def.type === 'percent' ? 0 : undefined}
        max={def.type === 'percent' ? 100 : undefined}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKey}
      />
    );
  }

  return (
    <div className="field-editor">
      {input}
      <div className="field-editor-actions">
        <button type="button" className="btn btn-primary btn-sm" onClick={apply}>Done</button>
        <button type="button" className="btn btn-outline btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
