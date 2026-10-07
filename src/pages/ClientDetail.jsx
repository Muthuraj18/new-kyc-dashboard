import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api';
import Layout from '../components/Layout';
import {
  PinIcon,
  ZoomInIcon,
  ZoomOutIcon,
  RotateLeftIcon,
  RotateRightIcon,
  ExpandIcon,
  InfoIcon,
  CaretDownIcon,
  PencilIcon,
} from '../components/icons';
import { orNa } from '../utils/format';

// Left column. Every value comes from kyc_master_details via GET /clients/:id/details.
// `timestamp` is the column (or first non-empty of several) shown in the "Stage Timestamp" box.
// Field types: 'bool' -> Yes/No, 'image' -> base64 photo, 'long' -> collapsible text.
const MODULES = [
  {
    key: 'mobile',
    label: 'Mobile',
    timestamp: 'mobile_otp_sent_at',
    fields: [
      { label: 'Mobile Number', key: 'mobile_number' },
      { label: 'Mobile Verified', key: 'mobile_verified', type: 'bool' },
    ],
  },
  {
    key: 'email',
    label: 'Email',
    timestamp: 'email_otp_sent_at',
    fields: [
      { label: 'Email', key: 'email' },
      { label: 'Email Verified', key: 'email_verified', type: 'bool' },
    ],
  },
  {
    key: 'pan',
    label: 'Pan',
    fields: [
      { label: 'Pan Number', key: 'pan_number' },
      { label: 'Dob', key: 'dob' },
    ],
  },
  {
    key: 'digilocker',
    label: 'Digilocker',
    fields: [
      { label: 'Photo', key: 'digilocker_photo_base64', type: 'image' },
      { label: 'Name', key: 'digilocker_name' },
      { label: 'Father Name', key: 'digilocker_father_name' },
      { label: 'Gender', key: 'digilocker_gender' },
      { label: 'Dob', key: 'digilocker_dob' },
      { label: 'Aadhaar Number (masked)', key: 'digilocker_aadhaar_number_masked' },
      { label: 'Address', key: 'digilocker_address' },
      { label: 'City', key: 'digilocker_city' },
      { label: 'District', key: 'digilocker_district' },
      { label: 'State', key: 'digilocker_state' },
      { label: 'Pincode', key: 'digilocker_pincode' },
      { label: 'Provider', key: 'digilocker_provider' },
      { label: 'Raw XML', key: 'digilocker_raw_xml', type: 'long' },
    ],
  },
  {
    key: 'personal',
    label: 'Personal details',
    fields: [
      { label: 'Father Name', key: 'personal_father_name' },
      { label: 'Mother Name', key: 'mother_name' },
      { label: 'Gender', key: 'gender' },
      { label: 'Marital Status', key: 'marital_status' },
      { label: 'Education', key: 'education' },
      { label: 'Annual Income', key: 'annual_income' },
      { label: 'Trading Experience', key: 'trading_experience' },
      { label: 'Politically Exposed', key: 'politically_exposed', type: 'bool' },
      { label: 'Occupation', key: 'occupation' },
      { label: 'Citizen Of India', key: 'citizen_of_india', type: 'bool' },
      { label: 'Net Worth', key: 'net_worth' },
      { label: 'Country Of Birth', key: 'country_of_birth' },
    ],
  },
  {
    key: 'bank',
    label: 'Bank',
    fields: [
      { label: 'Account Holder Name', key: 'bank_account_holder_name' },
      { label: 'Account Number', key: 'bank_account_number' },
      { label: 'Confirm Account Number', key: 'bank_confirm_account_number' },
      { label: 'Ifsc Code', key: 'bank_ifsc_code' },
      { label: 'Micr Code', key: 'bank_micr_code' },
      { label: 'Account Type', key: 'bank_account_type' },
      { label: 'Verification Amount', key: 'bank_verification_amount' },
      { label: 'Verification Status', key: 'bank_verification_status' },
      { label: 'Verification Type', key: 'bank_verification_type' },
      { label: 'Bank Verified', key: 'bank_bank_verified', type: 'bool' },
      { label: 'Bank Name', key: 'bank_name' },
      { label: 'Branch Name', key: 'bank_branch_name' },
      { label: 'Bank Address', key: 'bank_address' },
    ],
  },
  {
    key: 'nominee',
    label: 'Nominee',
    // Only nominees that actually have a name are listed; guardian fields always shown.
    fields: (d) => [
      { label: 'Nominee Count', key: 'nominee_count' },
      ...[1, 2, 3]
        .filter((n) => d[`nominee_name_${n}`])
        .flatMap((n) => [
          { label: `Nominee ${n} Name`, key: `nominee_name_${n}` },
          { label: `Nominee ${n} Dob`, key: `nominee_dob_${n}` },
          { label: `Nominee ${n} Relation`, key: `nominee_relation_${n}` },
          { label: `Nominee ${n} Allocation %`, key: `nominee_allocation_percentage_${n}` },
        ]),
      { label: 'Guardian Name', key: 'guardian_name' },
      { label: 'Guardian Relation', key: 'guardian_relation' },
      { label: 'Guardian Mobile', key: 'guardian_mobile' },
      { label: 'Guardian Dob', key: 'guardian_dob' },
      { label: 'Guardian Address', key: 'guardian_address' },
    ],
  },
  {
    key: 'paymentgateway',
    label: 'payment_gateway',
    timestamp: ['payment_completed_at', 'payment_created_at'],
    fields: [
      { label: 'Txnid', key: 'payment_txnid' },
      { label: 'Order Id', key: 'payment_order_id' },
      { label: 'Payment Id', key: 'payment_id' },
      { label: 'Amount', key: 'payment_amount' },
      { label: 'Currency', key: 'payment_currency' },
      { label: 'Payment Method', key: 'payment_method' },
      { label: 'Payment Status', key: 'payment_status' },
      { label: 'Provider', key: 'payment_provider' },
      { label: 'Firstname', key: 'payment_firstname' },
      { label: 'Email', key: 'payment_email' },
      { label: 'Phone', key: 'payment_phone' },
      { label: 'Receipt', key: 'payment_receipt' },
      { label: 'Description', key: 'payment_description' },
      { label: 'Error Code', key: 'payment_error_code' },
      { label: 'Error Description', key: 'payment_error_description' },
      { label: 'Created At', key: 'payment_created_at' },
      { label: 'Source Verified', key: 'payment_source_verified', type: 'bool' },
      { label: 'Source Note', key: 'payment_source_note' },
    ],
  },
];

const isEmpty = (v) => v === null || v === undefined || v === '';

function photoSrc(value) {
  return String(value).startsWith('data:') ? value : `data:image/jpeg;base64,${value}`;
}

function FieldValue({ field, value }) {
  if (isEmpty(value)) return <strong className="na">N/A</strong>;
  if (field.type === 'bool') return <strong>{value ? 'Yes' : 'No'}</strong>;
  if (field.type === 'image') return <img className="module-photo" src={photoSrc(value)} alt={field.label} />;
  if (field.type === 'long') {
    return (
      <details className="module-long">
        <summary>Show</summary>
        <pre>{value}</pre>
      </details>
    );
  }
  return <strong>{String(value)}</strong>;
}

// Middle column. Each key matches GET /clients/:id/documents/:doc, which finds the latest
// file in S3 (aionion-kyc-prekyc-document/Client/Uploads/...) and returns a short-lived URL.
const DOCUMENTS = [
  { key: 'livephoto', label: 'Client-live-image' },
  { key: 'signature', label: 'Signature' },
  { key: 'unsignedpdf', label: 'Unsigned pdf' },
  { key: 'esignedpdf', label: 'Esigned pdf' },
  { key: 'esignredirect', label: 'Esign Redirect Url' },
];

const NOT_CONNECTED = 'Not connected to the backend yet.';

export default function ClientDetail() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [details, setDetails] = useState(null);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [openModule, setOpenModule] = useState(null);
  const [activeDoc, setActiveDoc] = useState(DOCUMENTS[0].key);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [notice, setNotice] = useState('');
  const [docs, setDocs] = useState({}); // docKey -> { loading } | { error } | { type, url, fileName, searched }
  const previewRef = useRef(null);

  useEffect(() => {
    api.get(`/clients/${id}`)
      .then(({ data }) => {
        setClient(data.data);
        setName(data.data.client_name || '');
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load client'));
    api.get(`/clients/${id}/details`)
      .then(({ data }) => setDetails(data.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load client details'));
  }, [id]);

  // Reset the viewer and load the picked document (once per document; cached after that).
  useEffect(() => {
    setZoom(100);
    setRotation(0);
    if (docs[activeDoc]) return;
    setDocs((d) => ({ ...d, [activeDoc]: { loading: true } }));
    api.get(`/clients/${id}/documents/${activeDoc}`)
      .then(({ data }) => setDocs((d) => ({ ...d, [activeDoc]: data.data })))
      .catch((err) => setDocs((d) => ({
        ...d,
        [activeDoc]: { error: err.response?.data?.error || 'Failed to load document' },
      })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDoc, id]);

  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3000);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else previewRef.current?.requestFullscreen?.();
  };

  const doc = DOCUMENTS.find((d) => d.key === activeDoc);
  const file = docs[activeDoc];
  const viewStyle = { transform: `scale(${zoom / 100}) rotate(${rotation}deg)` };

  function renderPreview() {
    if (!file || file.loading) return <div className="preview-empty"><span>Loading {doc.label}…</span></div>;
    if (file.error) return <div className="preview-empty"><strong>{doc.label}</strong><span>{file.error}</span></div>;
    if (file.type === 'link') {
      return file.url ? (
        <div className="preview-empty preview-link">
          <strong>{doc.label}</strong>
          <a href={file.url} target="_blank" rel="noreferrer">{file.url}</a>
          <a className="btn btn-blue" href={file.url} target="_blank" rel="noreferrer">Open link</a>
        </div>
      ) : (
        <div className="preview-empty"><strong>{doc.label}</strong><span>No data available</span></div>
      );
    }
    if (!file.url) {
      return (
        <div className="preview-empty">
          <strong>{doc.label}</strong>
          <span>No file found in S3 for this client.</span>
          {file.searched && (
            <details className="preview-searched">
              <summary>Where we looked</summary>
              <ul>{file.searched.map((p) => <li key={p}>{file.bucket}/{p}</li>)}</ul>
            </details>
          )}
        </div>
      );
    }
    if (file.type === 'pdf') {
      return <iframe className="preview-pdf" src={file.url} title={doc.label} style={viewStyle} />;
    }
    return <img src={file.url} alt={doc.label} className="preview-img" style={viewStyle} />;
  }

  return (
    <Layout title="Client Details">
      <div className="detail-back">
        <Link to="/clients">&larr; Back to Clients</Link>
      </div>

      {error ? (
        <div className="table-card"><div className="state-msg">{error}</div></div>
      ) : (
        <>
          <div className="detail-header">
            <div className="detail-summary">
              <div><span>Unique ID</span><strong>{client ? orNa(client.unique_id) : '…'}</strong></div>
              <div><span>Client Code</span><strong>{client ? orNa(client.client_code) : '…'}</strong></div>
              <div><span>PAN</span><strong>{client ? orNa(client.pan_number) : '…'}</strong></div>
              <div><span>KYC Type</span><strong>{client ? orNa(client.kyc_type) : '…'}</strong></div>
            </div>
            <div className="detail-name-row">
              <div className="form-field detail-name-field">
                <label htmlFor="client-name">Client Name</label>
                <input id="client-name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <button className="btn btn-success" onClick={() => showNotice(NOT_CONNECTED)}>Update Name</button>
            </div>
          </div>

          <div className="detail-grid">
            <section className="detail-panel">
              <div className="detail-panel-title">Modules</div>
              <ul className="module-list">
                {MODULES.map((m) => {
                  const isOpen = openModule === m.key;
                  const fields = details ? (typeof m.fields === 'function' ? m.fields(details) : m.fields) : [];
                  const stamp = details && m.timestamp ? [].concat(m.timestamp).map((k) => details[k]).find((v) => !isEmpty(v)) : null;
                  const hasData = !isEmpty(stamp) || fields.some((f) => !isEmpty(details?.[f.key]));
                  return (
                    <li key={m.key} className={isOpen ? 'open' : ''}>
                      <button className="module-toggle" onClick={() => setOpenModule(isOpen ? null : m.key)}>
                        <span>{m.label}</span>
                        <CaretDownIcon className="ui-icon caret" />
                      </button>
                      {isOpen && (
                        <div className="module-body">
                          {!details ? (
                            <span className="na">Loading…</span>
                          ) : !m.fields.length && typeof m.fields !== 'function' ? (
                            <span className="na">Fields not mapped yet.</span>
                          ) : !hasData ? (
                            <span className="na">No data available</span>
                          ) : (
                            <>
                              {!isEmpty(stamp) && (
                                <div className="module-stamp">
                                  <span>Stage Timestamp</span>
                                  <strong>{stamp}</strong>
                                </div>
                              )}
                              {fields.map((f) => (
                                <div key={f.key} className="module-field">
                                  <div className="module-field-text">
                                    <span>{f.label}</span>
                                    <FieldValue field={f} value={details[f.key]} />
                                  </div>
                                  <button
                                    className="module-edit"
                                    title={`Edit ${f.label}`}
                                    onClick={() => showNotice('Editing is not connected yet.')}
                                  >
                                    <PencilIcon />
                                  </button>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="detail-panel">
              <div className="detail-panel-title">Documents</div>
              <ul className="doc-list">
                {DOCUMENTS.map((d) => (
                  <li key={d.key}>
                    <button
                      className={`doc-item ${activeDoc === d.key ? 'active' : ''}`}
                      onClick={() => setActiveDoc(d.key)}
                    >
                      <span>{d.label}</span>
                      <PinIcon className="ui-icon pin" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="detail-panel preview-panel">
              <div className="preview-area" ref={previewRef}>
                <span className="preview-badge">Preview</span>
                {file?.fileName && <span className="preview-filename" title={file.key}>{file.fileName}</span>}
                {renderPreview()}
                <div className="preview-toolbar">
                  <button title="Zoom out" onClick={() => setZoom((z) => Math.max(25, z - 25))}><ZoomOutIcon /></button>
                  <button title="Zoom in" onClick={() => setZoom((z) => Math.min(400, z + 25))}><ZoomInIcon /></button>
                  <button title="Rotate left" onClick={() => setRotation((r) => r - 90)}><RotateLeftIcon /></button>
                  <button title="Rotate right" onClick={() => setRotation((r) => r + 90)}><RotateRightIcon /></button>
                  <button title="Full screen" onClick={toggleFullscreen}><ExpandIcon /></button>
                  <span className="zoom-label">{zoom}%</span>
                </div>
              </div>

              <div className="preview-actions">
                <button className="btn btn-outline btn-pill" onClick={() => showNotice(NOT_CONNECTED)}>Upload File</button>
                <div className="preview-actions-right">
                  <button className="btn btn-outline" title="Save changes" onClick={() => showNotice(NOT_CONNECTED)}>
                    Save <InfoIcon />
                  </button>
                  <button className="btn btn-blue" title="Save and generate the KYC PDF" onClick={() => showNotice(NOT_CONNECTED)}>
                    Save &amp; Generate PDF <InfoIcon />
                  </button>
                </div>
              </div>
            </section>
          </div>
        </>
      )}

      {notice && <div className="detail-toast">{notice}</div>}
    </Layout>
  );
}
