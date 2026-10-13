import { useRef, useState } from 'react';
import readXlsxFile from 'read-excel-file';
import api from '../api';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

const UPLOAD_ROLES = ['Super Admin', 'Admin'];
const MAX_ISSUES_SHOWN = 500;

// Excel shows big numbers like 1.20816E+15 when a BOID column isn't formatted as Text.
const SCIENTIFIC = /^\d(\.\d+)?e\+\d+$/i;

function parseCsv(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.split(',').map((cell) => cell.trim().replace(/^"(.*)"$/, '$1')));
}

async function readSheet(file) {
  if (/\.csv$/i.test(file.name)) return parseCsv(await file.text());
  return readXlsxFile(file);
}

const isBlank = (v) => v === null || v === undefined || String(v).trim() === '';

// Picks the BOID column (a header containing "boid", else the first column) and returns
// one { row, value, numeric } per non-empty row, with row = the Excel row number.
function extractBoidRows(sheet) {
  const header = (sheet[0] || []).map((c) => String(c ?? '').toLowerCase());
  let col = header.findIndex((h) => h.replace(/[\s_-]/g, '').includes('boid'));
  let start = 1;
  if (col === -1) {
    col = 0;
    // No BOID header: row 1 is data unless its first cell has no digits (some other header).
    start = /\d/.test(header[0] || '') ? 0 : 1;
  }

  const rows = [];
  for (let i = start; i < sheet.length; i += 1) {
    const cells = sheet[i] || [];
    if (cells.every(isBlank)) continue;
    const cell = cells[col];
    const numeric = typeof cell === 'number' || SCIENTIFIC.test(String(cell ?? '').trim());
    rows.push({ row: i + 1, value: isBlank(cell) ? '' : String(cell).trim(), numeric });
  }
  return rows;
}

function downloadIssues(issues) {
  const lines = ['Row,BOID,Result,Reason', ...issues.map((i) => [i.row, `="${i.boid}"`, i.result, `"${i.reason}"`].join(','))];
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'boid-upload-issues.csv';
  a.click();
  URL.revokeObjectURL(url);
}

const RESULT_PILL = { duplicate: 'pill-warning', invalid: 'pill-no', failed: 'pill-no' };

function SummaryCard({ label, value, tone }) {
  return (
    <div className={`stat-card${tone ? ` stat-${tone}` : ''}`} style={{ cursor: 'default' }}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}

function BoidUpload() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleUpload = async () => {
    if (!file) return;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const rows = extractBoidRows(await readSheet(file));
      if (!rows.length) throw new Error('No BOID rows found in the file.');
      const res = await api.post('/upload/boid', { fileName: file.name, rows });
      setResult(res.data);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="table-card" style={{ padding: 22, overflow: 'visible' }}>
      <h3 style={{ margin: 0, fontSize: 16 }}>BOID Upload</h3>
      <p style={{ color: 'var(--muted)', fontSize: 13.5, margin: '6px 0 16px' }}>
        Upload an Excel (.xlsx) or CSV file with one BOID per row, in a column headed <b>BOID</b> (or the
        first column). Each BOID must be 16 digits; format the column as <b>Text</b> in Excel so the last
        digit isn&apos;t lost. Valid new BOIDs are added as <b>AVAILABLE</b> stock.
      </p>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.csv"
          onChange={(e) => { setFile(e.target.files[0] || null); setError(''); }}
        />
        <button className="btn btn-primary" disabled={!file || busy} onClick={handleUpload}>
          {busy ? 'Uploading...' : 'Upload'}
        </button>
      </div>

      {error && <div className="form-error" style={{ marginTop: 14 }}>{error}</div>}

      {result && (
        <div style={{ marginTop: 22 }}>
          <div style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 10 }}>
            Upload summary{result.fileName ? ` for ${result.fileName}` : ''}
          </div>
          <div className="stat-grid">
            <SummaryCard label="Total Rows" value={result.totalRows} />
            <SummaryCard label="Inserted" value={result.inserted} tone="success" />
            <SummaryCard label="Duplicate" value={result.duplicate} tone="warning" />
            <SummaryCard label="Invalid" value={result.invalid} tone="danger" />
            <SummaryCard label="Failed" value={result.failed} tone="danger" />
          </div>

          {result.issues.length > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '6px 0 10px' }}>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>
                  Rows not inserted ({result.issues.length})
                  {result.issues.length > MAX_ISSUES_SHOWN && ` - showing first ${MAX_ISSUES_SHOWN}`}
                </span>
                <button className="btn btn-outline btn-sm" onClick={() => downloadIssues(result.issues)}>
                  Download CSV
                </button>
              </div>
              <div className="table-card" style={{ maxHeight: 420 }}>
                <table className="data-table data-table--compact">
                  <thead>
                    <tr><th>Row</th><th>BOID</th><th>Result</th><th>Reason</th></tr>
                  </thead>
                  <tbody>
                    {result.issues.slice(0, MAX_ISSUES_SHOWN).map((i) => (
                      <tr key={`${i.row}-${i.result}`}>
                        <td>{i.row}</td>
                        <td className="mono">{i.boid || <span className="na">(empty)</span>}</td>
                        <td><span className={`pill ${RESULT_PILL[i.result]}`}>{i.result}</span></td>
                        <td>{i.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function Upload() {
  const { user } = useAuth();

  return (
    <Layout title="Upload">
      {UPLOAD_ROLES.includes(user?.role) ? (
        <BoidUpload />
      ) : (
        <div className="table-card state-msg">Only an admin can upload stock.</div>
      )}
    </Layout>
  );
}
