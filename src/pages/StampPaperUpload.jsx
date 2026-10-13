import { useEffect, useRef, useState } from 'react';
import { BlobReader, BlobWriter, ZipReader, configure } from '@zip.js/zip.js';
import api from '../api';
import { UploadIcon } from '../components/icons';
import { DropZone, IssuesTable, UploadSummary, formatSize } from '../components/UploadParts';

// Inflate on the main thread; avoids shipping zip.js web-worker files with the build.
configure({ useWebWorkers: false });

const BATCH_SIZE = 100; // files signed, uploaded and recorded per round trip
const CONCURRENCY = 6; // parallel PUTs to S3
const RETRIES = 2;

const ISSUE_COLUMNS = [
  { label: 'File', key: 'file' },
  { label: 'Stamp Number', key: 'stampNumber', mono: true },
];

const baseName = (path) => path.split(/[\\/]/).pop();

// One source per PDF to upload: { name, size, getBlob }. ZIP entries are read lazily,
// so a ZIP with thousands of PDFs is never unpacked into memory all at once.
async function collectSources(files) {
  const sources = [];
  const readers = [];
  for (const file of files) {
    if (/\.zip$/i.test(file.name)) {
      const reader = new ZipReader(new BlobReader(file));
      readers.push(reader);
      const entries = await reader.getEntries();
      entries
        .filter((e) => !e.directory && !/(^|\/)(__MACOSX\/|\._)/.test(e.filename))
        .forEach((e) => sources.push({
          name: baseName(e.filename),
          size: e.uncompressedSize,
          getBlob: () => e.getData(new BlobWriter('application/pdf')),
        }));
    } else {
      sources.push({ name: file.name, size: file.size, getBlob: async () => file });
    }
  }
  return { sources, close: () => Promise.all(readers.map((r) => r.close())) };
}

async function isPdf(blob) {
  const head = new Uint8Array(await blob.slice(0, 5).arrayBuffer());
  return String.fromCharCode(...head).startsWith('%PDF');
}

async function putWithRetry(url, blob) {
  let lastErr;
  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    try {
      const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: blob });
      if (res.ok) return;
      lastErr = new Error(`S3 responded ${res.status}`);
    } catch (err) {
      lastErr = err; // network / CORS failure
    }
  }
  throw lastErr;
}

// Runs fn over items with at most `limit` in flight.
async function runPool(items, limit, fn) {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next];
      next += 1;
      await fn(item);
    }
  });
  await Promise.all(workers);
}

const apiError = (err, fallback) => err.response?.data?.error || err.message || fallback;

export default function StampPaperUpload() {
  const inputRef = useRef(null);
  const [selection, setSelection] = useState(null); // { files, sources, close, totalSize }
  const [phase, setPhase] = useState('idle'); // idle | reading | checking | uploading | done
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const busy = phase === 'reading' || phase === 'checking' || phase === 'uploading';

  // Warn before closing the tab mid-upload.
  useEffect(() => {
    if (phase !== 'uploading') return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [phase]);

  const clearSelection = () => {
    selection?.close();
    setSelection(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const pickFiles = async (files) => {
    const bad = files.find((f) => !/\.(pdf|zip)$/i.test(f.name));
    if (bad) {
      setError(`${bad.name} is not a PDF or ZIP file.`);
      return;
    }
    clearSelection();
    setError('');
    setResult(null);
    setPhase('reading');
    try {
      const { sources, close } = await collectSources(files);
      if (!sources.length) throw new Error('No files found in the selection.');
      setSelection({ files, sources, close, totalSize: sources.reduce((s, x) => s + x.size, 0) });
    } catch (err) {
      setError(`Could not read the files: ${err.message}`);
    } finally {
      setPhase('idle');
    }
  };

  const handleUpload = async () => {
    const { sources } = selection;
    const issues = [];
    let inserted = 0;
    setError('');
    setResult(null);

    try {
      // 1. Validate names and find duplicates (in upload, in table, in S3).
      setPhase('checking');
      const { data: check } = await api.post('/upload/stamp-paper/check', { files: sources.map((s) => s.name) });
      issues.push(...check.issues);
      const sourceByName = new Map();
      sources.forEach((s) => { if (!sourceByName.has(s.name)) sourceByName.set(s.name, s); });
      const queue = check.accepted.map((a) => ({ ...a, source: sourceByName.get(a.file) }));

      // 2-4. Per batch: sign, PUT to S3, then record in stamp_paper_master.
      setPhase('uploading');
      setProgress({ done: 0, total: queue.length });
      for (let i = 0; i < queue.length; i += BATCH_SIZE) {
        const batch = queue.slice(i, i + BATCH_SIZE);
        let urls;
        try {
          ({ data: { urls } } = await api.post('/upload/stamp-paper/sign', { stampNumbers: batch.map((b) => b.stampNumber) }));
        } catch (err) {
          // Usually a configuration problem that would fail every batch, so stop here.
          const reason = `Not uploaded: ${apiError(err, 'could not get upload URL')}`;
          queue.slice(i).forEach((b) => issues.push({ file: b.file, stampNumber: b.stampNumber, result: 'failed', reason }));
          break;
        }

        const uploaded = [];
        await runPool(batch, CONCURRENCY, async (b) => {
          try {
            const blob = await b.source.getBlob();
            if (!(await isPdf(blob))) {
              issues.push({ file: b.file, stampNumber: b.stampNumber, result: 'invalid', reason: 'Not a valid PDF file' });
            } else {
              await putWithRetry(urls[b.stampNumber], blob);
              uploaded.push(b);
            }
          } catch (err) {
            issues.push({ file: b.file, stampNumber: b.stampNumber, result: 'failed', reason: `S3 upload failed (${err.message})` });
          }
          setProgress((p) => ({ ...p, done: p.done + 1 }));
        });

        if (uploaded.length) {
          try {
            const { data } = await api.post('/upload/stamp-paper/complete', { stampNumbers: uploaded.map((b) => b.stampNumber) });
            inserted += data.inserted.length;
            const fileOf = new Map(uploaded.map((b) => [b.stampNumber, b.file]));
            data.duplicate.forEach((s) => issues.push({ file: fileOf.get(s), stampNumber: s, result: 'duplicate', reason: 'Already exists in stamp_paper_master' }));
            data.missing.forEach((s) => issues.push({ file: fileOf.get(s), stampNumber: s, result: 'failed', reason: 'Not found in S3 after upload' }));
          } catch (err) {
            const reason = `Uploaded to S3 but not added to table: ${apiError(err, 'save failed')}`;
            uploaded.forEach((b) => issues.push({ file: b.file, stampNumber: b.stampNumber, result: 'failed', reason }));
          }
        }
      }

      const count = (r) => issues.filter((x) => x.result === r).length;
      setResult({
        totalFiles: sources.length,
        inserted,
        duplicate: count('duplicate'),
        invalid: count('invalid'),
        failed: count('failed'),
        issues,
      });
      clearSelection();
    } catch (err) {
      setError(apiError(err, 'Upload failed'));
    } finally {
      setPhase('done');
    }
  };

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  const zipCount = selection?.files.filter((f) => /\.zip$/i.test(f.name)).length || 0;

  return (
    <>
      <div className="upload-card">
        <div className="upload-card-head">
          <span className="upload-card-icon"><UploadIcon /></span>
          <div>
            <h3>Stamp Paper Upload</h3>
            <p>Bulk upload stamp paper PDFs to S3 and add them to stock</p>
          </div>
        </div>

        <div className="upload-card-body">
          <DropZone
            icon={<UploadIcon />}
            title="PDFs or a ZIP"
            hint="Select many PDFs or one .zip of PDFs (3,000+ files supported)"
            accept=".pdf,.zip"
            multiple
            inputRef={inputRef}
            disabled={busy}
            onFiles={pickFiles}
          />

          {phase === 'reading' && <div className="file-chip">Reading files...</div>}

          {selection && (
            <div className="file-chip">
              <span style={{ minWidth: 0 }}>
                <span className="file-chip-name">{selection.sources.length.toLocaleString()} files</span>
                <span className="file-chip-size">
                  {formatSize(selection.totalSize)}{zipCount ? ` · from ${zipCount} ZIP` : ''}
                </span>
              </span>
              <button className="btn btn-outline btn-sm" onClick={clearSelection} disabled={busy}>Remove</button>
            </div>
          )}

          {(phase === 'checking' || phase === 'uploading') && (
            <div className="upload-progress">
              <div className="upload-progress-label">
                {phase === 'checking'
                  ? 'Checking for duplicates...'
                  : `Uploading ${progress.done.toLocaleString()} / ${progress.total.toLocaleString()} (${pct}%) - keep this tab open`}
              </div>
              <div className="upload-progress-track">
                <div className="upload-progress-bar" style={{ width: `${phase === 'checking' ? 0 : pct}%` }} />
              </div>
            </div>
          )}

          <ul className="upload-rules">
            <li>Name each PDF after its stamp number, e.g. <b>DK123456.pdf</b>.</li>
            <li>Stored in S3 at <b>stamp_papers/Stamp paper/</b> and added as <b>AVAILABLE</b> stock.</li>
            <li>Duplicates are not allowed: numbers already in the table or S3 are skipped.</li>
          </ul>

          {error && <div className="form-error" style={{ marginTop: 14 }}>{error}</div>}

          <div className="upload-actions">
            <button className="btn btn-primary" disabled={!selection || busy} onClick={handleUpload}>
              {busy && phase !== 'reading' ? 'Uploading...' : 'Upload Stamp Papers'}
            </button>
          </div>
        </div>
      </div>

      {result && (
        <>
          <UploadSummary
            title="Upload summary"
            cards={[
              { label: 'Total Files', value: result.totalFiles },
              { label: 'Inserted', value: result.inserted, tone: 'success' },
              { label: 'Duplicate', value: result.duplicate, tone: 'warning' },
              { label: 'Invalid', value: result.invalid, tone: 'danger' },
              { label: 'Failed', value: result.failed, tone: 'danger' },
            ]}
          />
          <IssuesTable issues={result.issues} columns={ISSUE_COLUMNS} csvName="stamp-paper-upload-issues.csv" />
        </>
      )}
    </>
  );
}
