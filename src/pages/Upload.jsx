import { useRef, useState } from 'react';
import readXlsxFile from 'read-excel-file';
import api from '../api';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { UploadIcon } from '../components/icons';
import { DropZone, IssuesTable, UploadSummary, formatSize } from '../components/UploadParts';
import StampPaperUpload from './StampPaperUpload';

const UPLOAD_ROLES = ['Super Admin', 'Admin'];

const TABS = [
  { key: 'boid', label: 'BOID' },
  { key: 'stampPaper', label: 'Stamp Paper' },
];

// Excel shows big numbers like 1.20816E+15 when a BOID column isn't formatted as Text.
const SCIENTIFIC = /^\d(\.\d+)?e\+\d+$/i;

const BOID_ISSUE_COLUMNS = [
  { label: 'Row', key: 'row' },
  { label: 'BOID', key: 'boid', mono: true, excelText: true },
];

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

function BoidUpload() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const pickFile = ([f]) => {
    if (!/\.(xlsx|csv)$/i.test(f.name)) {
      setError('Choose an .xlsx or .csv file.');
      return;
    }
    setFile(f);
    setError('');
  };

  const clearFile = () => {
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
  };

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
      clearFile();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="upload-card">
        <div className="upload-card-head">
          <span className="upload-card-icon"><UploadIcon /></span>
          <div>
            <h3>BOID Upload</h3>
            <p>Add new BOIDs to stock from an Excel or CSV file</p>
          </div>
        </div>

        <div className="upload-card-body">
          <DropZone
            icon={<UploadIcon />}
            title="a file"
            hint=".xlsx or .csv, up to 20,000 rows"
            accept=".xlsx,.csv"
            inputRef={inputRef}
            disabled={busy}
            onFiles={pickFile}
          />

          {file && (
            <div className="file-chip">
              <span style={{ minWidth: 0 }}>
                <span className="file-chip-name">{file.name}</span>
                <span className="file-chip-size">{formatSize(file.size)}</span>
              </span>
              <button className="btn btn-outline btn-sm" onClick={clearFile} disabled={busy}>Remove</button>
            </div>
          )}

          <ul className="upload-rules">
            <li>One BOID per row, in a column headed <b>BOID</b> (or the first column).</li>
            <li>Each BOID must be exactly 16 digits. Format the column as <b>Text</b> in Excel.</li>
            <li>Valid new BOIDs are added as <b>AVAILABLE</b> stock; duplicates are skipped.</li>
          </ul>

          {error && <div className="form-error" style={{ marginTop: 14 }}>{error}</div>}

          <div className="upload-actions">
            <button className="btn btn-primary" disabled={!file || busy} onClick={handleUpload}>
              {busy ? 'Uploading...' : 'Upload BOIDs'}
            </button>
          </div>
        </div>
      </div>

      {result && (
        <>
          <UploadSummary
            title={`Upload summary${result.fileName ? ` for ${result.fileName}` : ''}`}
            cards={[
              { label: 'Total Rows', value: result.totalRows },
              { label: 'Inserted', value: result.inserted, tone: 'success' },
              { label: 'Duplicate', value: result.duplicate, tone: 'warning' },
              { label: 'Invalid', value: result.invalid, tone: 'danger' },
              { label: 'Failed', value: result.failed, tone: 'danger' },
            ]}
          />
          <IssuesTable issues={result.issues} columns={BOID_ISSUE_COLUMNS} csvName="boid-upload-issues.csv" />
        </>
      )}
    </>
  );
}

export default function Upload() {
  const { user } = useAuth();
  const [tab, setTab] = useState('boid');

  if (!UPLOAD_ROLES.includes(user?.role)) {
    return (
      <Layout title="Upload">
        <div className="table-card state-msg">Only an admin can upload stock.</div>
      </Layout>
    );
  }

  return (
    <Layout title="Upload">
      <div className="upload-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            className={`upload-tab${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Both stay mounted so switching tabs never interrupts a running upload. */}
      <div hidden={tab !== 'boid'}><BoidUpload /></div>
      <div hidden={tab !== 'stampPaper'}><StampPaperUpload /></div>
    </Layout>
  );
}
