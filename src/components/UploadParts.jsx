// Pieces shared by the BOID and Stamp Paper upload cards.
const MAX_ISSUES_SHOWN = 500;
const RESULT_PILL = { duplicate: 'pill-warning', invalid: 'pill-no', failed: 'pill-no' };

export const formatSize = (bytes) => (bytes < 1024 * 1024
  ? `${Math.max(1, Math.round(bytes / 1024))} KB`
  : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

// columns: [{ label, key, mono?, excelText? }] - excelText keeps long digit strings intact in Excel
function downloadCsv(fileName, columns, issues) {
  const lines = [
    columns.map((c) => c.label).concat('Result', 'Reason').join(','),
    ...issues.map((i) => columns
      .map((c) => (c.excelText ? `="${i[c.key] ?? ''}"` : csvCell(i[c.key])))
      .concat(i.result, csvCell(i.reason))
      .join(',')),
  ];
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export function SummaryCard({ label, value, tone }) {
  return (
    <div className={`stat-card${tone ? ` stat-${tone}` : ''}`} style={{ cursor: 'default' }}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}

export function UploadSummary({ title, cards }) {
  return (
    <>
      <div style={{ fontSize: 13.5, color: 'var(--muted)', margin: '22px 0 10px' }}>{title}</div>
      <div className="stat-grid">
        {cards.map((c) => <SummaryCard key={c.label} {...c} />)}
      </div>
    </>
  );
}

export function IssuesTable({ issues, columns, csvName }) {
  if (!issues.length) return null;
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '6px 0 10px' }}>
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>
          Rows not inserted ({issues.length})
          {issues.length > MAX_ISSUES_SHOWN && ` - showing first ${MAX_ISSUES_SHOWN}`}
        </span>
        <button className="btn btn-outline btn-sm" onClick={() => downloadCsv(csvName, columns, issues)}>
          Download CSV
        </button>
      </div>
      <div className="table-card" style={{ maxHeight: 420 }}>
        <table className="data-table data-table--compact">
          <thead>
            <tr>
              {columns.map((c) => <th key={c.key}>{c.label}</th>)}
              <th>Result</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {issues.slice(0, MAX_ISSUES_SHOWN).map((i, idx) => (
              // eslint-disable-next-line react/no-array-index-key
              <tr key={idx}>
                {columns.map((c) => (
                  <td key={c.key} className={c.mono ? 'mono' : undefined}>
                    {i[c.key] === '' || i[c.key] == null ? <span className="na">(empty)</span> : i[c.key]}
                  </td>
                ))}
                <td><span className={`pill ${RESULT_PILL[i.result]}`}>{i.result}</span></td>
                <td>{i.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// Dashed click-or-drop area. onFiles receives an array of File.
export function DropZone({ icon, title, hint, accept, multiple, onFiles, inputRef, disabled }) {
  const handle = (list) => { if (!disabled && list?.length) onFiles([...list]); };
  return (
    <label
      className="dropzone"
      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragging'); }}
      onDragLeave={(e) => e.currentTarget.classList.remove('dragging')}
      onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('dragging'); handle(e.dataTransfer.files); }}
    >
      {icon}
      <span className="dropzone-title"><span>Click to choose</span> or drag {title} here</span>
      <span className="dropzone-hint">{hint}</span>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        disabled={disabled}
        onChange={(e) => handle(e.target.files)}
      />
    </label>
  );
}
