export default function StatusPill({ value }) {
  if (!value || value === 'N/A') return <span className="na">N/A</span>;

  const normalized = String(value).toLowerCase();
  let cls = 'pill-pending';
  if (['completed', 'yes', 'success'].includes(normalized)) cls = 'pill-completed';
  else if (['in_progress', 'pushed'].includes(normalized)) cls = 'pill-progress';
  else if (['no', 'rejected', 'not completed'].includes(normalized)) cls = 'pill-no';

  const label = normalized === 'in_progress' ? 'In Progress' : value;

  return <span className={`pill ${cls}`}>{label}</span>;
}
