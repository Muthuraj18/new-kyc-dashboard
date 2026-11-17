// Helpers for the NRE - NRO pages. Column names come straight from the nre_nro tables,
// so labels and groups are derived from the names.

export const ACCOUNT_TYPES = [
  { value: 'nre', label: 'NRE' },
  { value: 'nro', label: 'NRO' },
];

const UPPER_WORDS = new Set(['pan', 'id', 'ifsc', 'micr', 'nre', 'nro', 'nri', 'ipv', 'boid', 'dob', 'pis', 'rm', 'otp', 'kyc', 'url', 'pdf', 'xml', 'dp', 'ucc', 'fatca', 'crs', 'pep', 'tin', 'oci', 'pio', 'ckyc', 'kra', 'bo', 'utr', 'upi']);

// 'foreign_address_line_1' -> 'Foreign Address Line 1'
export function fieldLabel(name) {
  return String(name)
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => (UPPER_WORDS.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

export function formatDateTime(value) {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// A display string for any column value (objects come back as { long: true, text }).
export function formatValue(value, type = '') {
  if (value === null || value === undefined || value === '') return { text: 'N/A', na: true };
  if (typeof value === 'boolean') return { text: value ? 'Yes' : 'No' };
  if (typeof value === 'object') return { text: JSON.stringify(value, null, 2), long: true };
  const s = String(value);
  if (/^date$/.test(type) && ISO_DATE.test(s)) return { text: s.slice(0, 10).split('-').reverse().join('/') };
  if (/timestamp/.test(type) || (ISO_DATE.test(s) && s.includes('T'))) return { text: formatDateTime(s) };
  if (s.length > 160) return { text: s, long: true };
  return { text: s };
}

// Detail page sections, matched on the column name (first match wins). Follows the
// nre_nro "application layout v19" column families; anything new lands in Other.
const GROUPS = [
  ['Logs & Raw Data', /(_logs$|_raw_response$|^documents$|^nominees$|^payments$|^generated_pdfs$|^events$|^signal$)/],
  ['Video Session', /^(rm_joined_at|client_joined_at|started_at|ended_at|token_expires_at|client_(latitude|longitude|location_accuracy|place|location_at|ip|user_agent)|report_pdf_path|rm_remarks)$/],
  ['Application', /^(id|unique_id|account_type|application_status|current_step|status|client_name|rm_|has_aadhaar|created_at|updated_at|requested_at|client_code|category_type|techexcel_)/],
  ['Contact', /^(registered_email|client_email|email_)/],
  ['PAN / ITR', /^(pan_|itr_)/],
  ['Passport', /^passport_/],
  ['Personal & FATCA', /^(personal_|date_of_birth)/],
  ['Aadhaar / DigiLocker', /^(aadhaar_|digilocker_)/],
  ['Bank', /^bank_/],
  ['PIS', /^pis_/],
  ['Indian ID / Address', /^local_id_/],
  ['Foreign ID / Address', /^foreign_id_/],
  ['Account Preferences', /(_instruction$|statement_requirement|electronic_transaction|share_email|annual_report|dividend|contract_note|dis_at_account)/],
  ['Nominees', /^nominee/],
  ['Scheme & Payment', /^(scheme_|payment_)/],
  ['Client Link', /^client_link_|^client_code_created/],
  ['Live Photo & Signature', /^(live_photo_|signature_)/],
  ['eSign & PDF', /^(esign_|application_pdf)/],
];

export function groupColumns(columns) {
  const groups = new Map(GROUPS.map(([label]) => [label, []]));
  groups.set('Other', []);
  for (const c of columns) {
    const name = c.name.toLowerCase();
    const hit = GROUPS.find(([, re]) => re.test(name));
    groups.get(hit ? hit[0] : 'Other').push(c);
  }
  return [...groups.entries()].filter(([, cols]) => cols.length).map(([label, cols]) => ({ label, columns: cols }));
}

// "12m 30s" between two timestamps (IPV call length).
export function duration(from, to) {
  if (!from || !to) return null;
  const s = Math.round((new Date(to) - new Date(from)) / 1000);
  if (!Number.isFinite(s) || s < 0) return null;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m ${s % 60}s`;
}

export function typeLabel(type) {
  return String(type || '').toUpperCase() || 'N/A';
}

// Query params without empty values.
export function cleanParams(obj) {
  const out = {};
  Object.entries(obj).forEach(([k, v]) => { if (v !== '' && v !== null && v !== undefined) out[k] = v; });
  return out;
}

export async function downloadBlob(response, fileName) {
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
