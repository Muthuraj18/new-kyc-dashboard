export function formatDate(value) {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'N/A';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function toInputDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export async function copyToClipboard(text) {
  if (!text || text === 'N/A') return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Clipboard API can fail in insecure contexts; fail silently.
  }
}

export function orNa(value) {
  return value === null || value === undefined || value === '' ? 'N/A' : value;
}

// 'bank-details' -> 'Bank Details', 'in_progress' -> 'In Progress'
export function formatLabel(value) {
  if (!value) return 'N/A';
  return String(value)
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
