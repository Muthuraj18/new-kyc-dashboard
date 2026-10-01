import { orNa, copyToClipboard } from '../utils/format';
import { CopyIcon } from './icons';

export default function CopyableCell({ value }) {
  const display = orNa(value);
  if (display === 'N/A') {
    return <span className="na">N/A</span>;
  }
  return (
    <>
      {display}
      <button className="copy-btn" onClick={() => copyToClipboard(display)} title="Copy">
        <CopyIcon /> Copy
      </button>
    </>
  );
}
