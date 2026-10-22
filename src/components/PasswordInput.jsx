import { useState } from 'react';

// Password box with a Show / Hide toggle.
export default function PasswordInput({ value, onChange, autoComplete = 'new-password', minLength = 8, required = true, disabled, id, autoFocus }) {
  const [show, setShow] = useState(false);
  return (
    <div className="password-input">
      <input
        id={id}
        className="field-input"
        type={show ? 'text' : 'password'}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button type="button" className="password-toggle" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
        {show ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}
