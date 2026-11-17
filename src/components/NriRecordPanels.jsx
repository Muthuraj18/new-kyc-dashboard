import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import { CaretDownIcon, ZoomInIcon, ZoomOutIcon, RotateLeftIcon, RotateRightIcon, ExpandIcon } from './icons';
import { fieldLabel, formatValue, formatDateTime, groupColumns } from '../utils/nri';
import { copyToClipboard } from '../utils/format';

// Every column of an nre_nro row, in collapsible sections, with a field search.
export function FieldsPanel({ title = 'Details', columns, record }) {
  const [filter, setFilter] = useState('');
  const groups = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const cols = f
      ? columns.filter((c) => c.name.toLowerCase().includes(f) || fieldLabel(c.name).toLowerCase().includes(f)
        || String(record?.[c.name] ?? '').toLowerCase().includes(f))
      : columns;
    return groupColumns(cols);
  }, [columns, record, filter]);
  const [open, setOpen] = useState(() => new Set(['Application', 'Video Session']));
  const toggle = (label) => setOpen((s) => {
    const n = new Set(s);
    if (n.has(label)) n.delete(label); else n.add(label);
    return n;
  });

  return (
    <div className="detail-panel">
      <div className="detail-panel-title">{title}</div>
      <input
        className="nri-field-search"
        type="text"
        placeholder="Find a field or value…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <ul className="module-list">
        {groups.map((g) => {
          const isOpen = open.has(g.label) || !!filter.trim();
          return (
            <li key={g.label} className={isOpen ? 'open' : ''}>
              <button type="button" className="module-toggle" onClick={() => toggle(g.label)}>
                <span>{g.label} <span className="nri-count">{g.columns.length}</span></span>
                <CaretDownIcon className="ui-icon caret" />
              </button>
              {isOpen && (
                <div className="module-body">
                  {g.columns.map((c) => {
                    const v = formatValue(record?.[c.name], c.type);
                    return (
                      <div key={c.name} className="module-field">
                        <div className="module-field-text">
                          <span title={c.name}>{fieldLabel(c.name)}</span>
                          {v.na ? <span className="na">N/A</span>
                            : v.long ? (
                              <details className="module-long"><summary>Show ({v.text.length} chars)</summary><pre>{v.text}</pre></details>
                            ) : <strong>{v.text}</strong>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </li>
          );
        })}
        {!groups.length && <li className="state-msg">No fields match.</li>}
      </ul>
    </div>
  );
}

const sizeText = (n) => (n == null ? '' : n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

function Preview({ group, fileIndex, onPickFile }) {
  const [zoom, setZoom] = useState(1);
  const [rotate, setRotate] = useState(0);
  const file = group?.files[fileIndex];
  useEffect(() => { setZoom(1); setRotate(0); }, [file?.key]);

  if (!group) return <div className="preview-empty"><span>Select a document</span></div>;
  if (!file) {
    return (
      <div className="preview-empty">
        <strong>{group.label}</strong>
        <span>No file found in S3 for this client.</span>
        <details className="preview-searched">
          <summary>Where we looked</summary>
          <ul>{group.searched.map((p) => <li key={p}>{p}</li>)}</ul>
        </details>
      </div>
    );
  }
  const style = { transform: `scale(${zoom}) rotate(${rotate}deg)` };
  return (
    <>
      <span className="preview-badge">{group.label}{group.files.length > 1 ? ` · ${fileIndex + 1} of ${group.files.length}` : ''}</span>
      <span className="preview-filename" title={file.key}>{file.name}</span>
      {file.kind === 'image' && <img src={file.url} alt={group.label} className="preview-img" style={style} />}
      {file.kind === 'pdf' && <iframe className="preview-pdf" src={file.url} title={group.label} />}
      {file.kind === 'video' && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video className="nri-video" src={file.url} controls preload="metadata" />
      )}
      {(file.kind === 'xml' || file.kind === 'file') && (
        <div className="preview-empty xml-download">
          <strong>{group.label}</strong>
          <span className="mono">{file.name}</span>
          <span>{sizeText(file.size)} · uploaded {formatDateTime(file.lastModified)}</span>
          <a className="btn btn-blue" href={file.url} rel="noreferrer">Download</a>
          <span className="xml-note">Private file: the link is valid for 15 minutes.</span>
        </div>
      )}
      {file.kind === 'image' && (
        <div className="preview-toolbar">
          <button type="button" title="Zoom out" onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}><ZoomOutIcon /></button>
          <span className="zoom-label">{Math.round(zoom * 100)}%</span>
          <button type="button" title="Zoom in" onClick={() => setZoom((z) => Math.min(4, z + 0.25))}><ZoomInIcon /></button>
          <button type="button" title="Rotate left" onClick={() => setRotate((r) => r - 90)}><RotateLeftIcon /></button>
          <button type="button" title="Rotate right" onClick={() => setRotate((r) => r + 90)}><RotateRightIcon /></button>
          <a title="Open in new tab" href={file.url} target="_blank" rel="noreferrer" className="nri-toolbar-link"><ExpandIcon /></a>
        </div>
      )}
      {group.files.length > 1 && (
        <div className="nri-file-strip">
          {group.files.map((f, i) => (
            <button key={f.key} type="button" className={`nri-file-chip${i === fileIndex ? ' active' : ''}`} onClick={() => onPickFile(i)} title={f.key}>
              {f.kind === 'image' ? <img src={f.url} alt="" /> : <span>{f.name}</span>}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

// S3 documents of one record: list of folders on the left, preview on the right.
// `sources`: [{ title, url }] - each url returns { bucket, groups } (e.g. application + its IPV).
export function DocumentsPanels({ sources }) {
  const [state, setState] = useState({}); // title -> { loading, error, groups }
  const [active, setActive] = useState(null); // { source, folder }
  const [fileIndex, setFileIndex] = useState(0);
  const sourceKey = sources.map((s) => s.url).join('|');

  useEffect(() => {
    let cancelled = false;
    setState(Object.fromEntries(sources.map((s) => [s.title, { loading: true }])));
    setActive(null);
    sources.forEach((s) => {
      api.get(s.url)
        .then(({ data }) => {
          if (cancelled) return;
          setState((st) => ({ ...st, [s.title]: { groups: data.data.groups } }));
          // Open the first folder that has a file.
          setActive((a) => {
            if (a) return a;
            const first = data.data.groups.find((g) => g.files.length);
            return first ? { source: s.title, folder: first.folder } : a;
          });
        })
        .catch((err) => {
          if (!cancelled) setState((st) => ({ ...st, [s.title]: { error: err.response?.data?.error || 'Failed to load documents' } }));
        });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey]);

  const activeGroup = active && state[active.source]?.groups?.find((g) => g.folder === active.folder);
  const pick = (source, folder) => { setActive({ source, folder }); setFileIndex(0); };

  return (
    <>
      <div className="detail-panel">
        <div className="detail-panel-title">Documents</div>
        {sources.map((s) => {
          const st = state[s.title] || {};
          return (
            <div key={s.title} className="nri-doc-source">
              {sources.length > 1 && <div className="nri-doc-source-title">{s.title}</div>}
              {st.loading && <div className="state-msg">Loading…</div>}
              {st.error && <div className="state-msg nri-error">{st.error}</div>}
              {st.groups && (
                <ul className="doc-list">
                  {st.groups.map((g) => (
                    <li key={g.folder}>
                      <button
                        type="button"
                        className={`doc-item${active?.source === s.title && active?.folder === g.folder ? ' active' : ''}${g.files.length ? '' : ' nri-doc-empty'}`}
                        onClick={() => pick(s.title, g.folder)}
                      >
                        <span>{g.label}</span>
                        <span className={`nri-count${g.files.length ? ' has' : ''}`}>{g.files.length || '—'}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <div className="detail-panel preview-panel">
        <div className="preview-area">
          <Preview group={activeGroup} fileIndex={fileIndex} onPickFile={setFileIndex} />
        </div>
        {activeGroup?.files[fileIndex] && (
          <div className="preview-actions">
            <span className="detail-notice mono" title={activeGroup.files[fileIndex].key}>
              {sizeText(activeGroup.files[fileIndex].size)} · {formatDateTime(activeGroup.files[fileIndex].lastModified)}
            </span>
            <div className="preview-actions-right">
              <button type="button" className="btn btn-outline" onClick={() => copyToClipboard(activeGroup.files[fileIndex].key)}>Copy S3 key</button>
              <a className="btn btn-blue" href={activeGroup.files[fileIndex].url} target="_blank" rel="noreferrer">Open</a>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
