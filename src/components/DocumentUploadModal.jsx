import { useState } from 'react';

const MAX_SIDE = 1600;

// Reads an image file and returns a data URL scaled to at most MAX_SIDE px.
// PNG stays PNG (keeps signature transparency); JPEG stays JPEG.
export async function prepareImage(file) {
  if (!/^image\/(png|jpeg)$/.test(file.type)) throw new Error('Choose a PNG or JPG image.');
  if (file.size > 15 * 1024 * 1024) throw new Error('The image is larger than 15 MB.');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('The file could not be read as an image.'));
      i.src = url;
    });
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    return { dataUrl: canvas.toDataURL(type, 0.9), width: canvas.width, height: canvas.height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Confirmation with a preview of the new image before replacing the client's file.
export default function DocumentUploadModal({ label, file, prepared, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await onConfirm();
    } catch (err) {
      setError(err.message || 'Upload failed');
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={busy ? undefined : onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3>Replace {label}</h3>
        <p style={{ color: 'var(--muted)', marginTop: -8, fontSize: 13.5 }}>
          {file.name} · {prepared.width}×{prepared.height}
        </p>
        <div className="upload-preview">
          <img src={prepared.dataUrl} alt={`New ${label}`} />
        </div>
        <p style={{ fontSize: 13.5, lineHeight: 1.6 }}>
          The client&apos;s current {label.toLowerCase()} in S3 is replaced (the old file is kept as a
          backup) and the next <b>Save &amp; Generate PDF</b> uses this image. Other documents are not
          changed. The replacement is recorded in the audit log.
        </p>
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? 'Uploading…' : 'Replace'}</button>
        </div>
      </div>
    </div>
  );
}
