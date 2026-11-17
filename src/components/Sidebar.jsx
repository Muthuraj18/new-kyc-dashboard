import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  DashboardIcon,
  ClientsIcon,
  PaymentsIcon,
  KycStatusIcon,
  IntegrationsIcon,
  UserManagementIcon,
  UploadIcon,
  AuditLogsIcon,
  TrashIcon,
  TableIcon,
  LogsIcon,
  AlertIcon,
  CaretDownIcon,
  VideoIcon,
} from './icons';
import useFeatures from '../hooks/useFeatures';
import { useAuth } from '../context/AuthContext';
import { can } from '../utils/permissions';

// Integration tables editable from the Tables menu (keys match GET /api/tables).
export const INTEGRATION_TABLES = [
  { key: 'cvlkra', label: 'CVLKRA' },
  { key: 'cdsl', label: 'CDSL' },
  { key: 'nse', label: 'NSE' },
  { key: 'bse', label: 'BSE' },
  { key: 'techexcel', label: 'TECHEXCEL' },
];

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', Icon: DashboardIcon, module: 'dashboard' },
  { to: '/clients', label: 'Clients', Icon: ClientsIcon, module: 'clients' },
  { to: '/need-attention', label: 'Need Attention', Icon: AlertIcon, module: 'need_attention' },
  { to: '/payments', label: 'Payments', Icon: PaymentsIcon, module: 'payments' },
  { to: '/kyc-status', label: 'KYC Status', Icon: KycStatusIcon, module: 'kyc_status' },
  { to: '/integrations', label: 'Integrations', Icon: IntegrationsIcon, module: 'integrations' },
  {
    to: '/tables',
    label: 'Tables',
    Icon: TableIcon,
    module: 'tables',
    children: INTEGRATION_TABLES.map((t) => ({ to: `/tables/${t.key}`, label: t.label })),
  },
  { to: '/kyc-logs', label: 'KYC Logs', Icon: LogsIcon, module: 'kyc_logs' },
  { to: '/user-management', label: 'User Management', Icon: UserManagementIcon, module: 'user_management' },
  { to: '/upload', label: 'Upload', Icon: UploadIcon, module: 'upload' },
  { to: '/audit-logs', label: 'Audit Logs', Icon: AuditLogsIcon, feature: 'auditLogs', module: 'audit_logs' },
  { to: '/trash', label: 'Trash', Icon: TrashIcon, feature: 'trash', module: 'trash' },
];

// NRE - NRO section (kyc_master.nre_nro). All pages live under /nri.
const NRI_ITEMS = [
  { to: '/nri/dashboard', label: 'Dashboard', Icon: DashboardIcon },
  { to: '/nri/applications', label: 'Clients', Icon: ClientsIcon },
  { to: '/nri/ipv', label: 'IPV Verification', Icon: VideoIcon },
  { to: '/nri/boid', label: 'BOID Numbers', Icon: TableIcon },
];

function NavItems({ items }) {
  return items.map((item) => (item.children ? (
    <NavGroup key={item.to} item={item} />
  ) : (
    <li key={item.to}>
      <NavLink to={item.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
        <item.Icon />
        <span>{item.label}</span>
      </NavLink>
    </li>
  )));
}

// Section header (KYC - PRE KYC / NRE - NRO). `active`: the section you are in (highlighted);
// `open`: its menu is shown below it.
function SectionHeader({ label, active, open, onClick }) {
  return (
    <li>
      <button type="button" className={`nav-section${active ? ' active' : ''}`} aria-expanded={open} onClick={onClick}>
        <span>{label}</span>
        <CaretDownIcon className={`ui-icon nav-caret${open ? ' open' : ''}`} />
      </button>
    </li>
  );
}

function NavGroup({ item }) {
  const { pathname } = useLocation();
  const inside = pathname.startsWith(item.to);
  // Open when entering one of its pages; otherwise the caret alone opens / closes it.
  const [open, setOpen] = useState(inside);
  useEffect(() => {
    if (inside) setOpen(true);
  }, [inside]);
  const { Icon } = item;
  return (
    <li>
      <button
        type="button"
        className={`nav-item nav-group-toggle${inside ? ' active' : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon />
        <span>{item.label}</span>
        <CaretDownIcon className={`ui-icon nav-caret${open ? ' open' : ''}`} />
      </button>
      {open && (
        <ul className="nav-sublist">
          {item.children.map((c) => (
            <li key={c.to}>
              <NavLink to={c.to} className={({ isActive }) => `nav-subitem${isActive ? ' active' : ''}`}>
                {c.label}
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export default function Sidebar() {
  const features = useFeatures();
  const { user } = useAuth();
  const items = NAV_ITEMS.filter((item) => (!item.feature || features[item.feature])
    && can(user, item.module));
  const { pathname } = useLocation();
  const navigate = useNavigate();
  // Users without NRE - NRO access see the KYC menu exactly as before (no section headers).
  const hasNri = can(user, 'nri');
  const inNri = pathname.startsWith('/nri');
  // The current section's menu can be folded by clicking its header again; it opens again
  // on the next click (or when moving to the other section).
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => { setCollapsed(false); }, [inNri]);
  const kycOpen = !hasNri || (!inNri && !collapsed);
  const nriOpen = hasNri && ((inNri && !collapsed) || items.length === 0);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img className="brand-logo" src="/aionion-logo.png" alt="AIONION Capital" />
        <div className="sidebar-brand-text">
          {/* <div className="subtitle">KYC Operations</div> */}
        </div>
      </div>

      <ul className="nav-list">
        {hasNri && items.length > 0 && (
          <SectionHeader
            label="KYC - PRE KYC"
            active={!inNri}
            open={kycOpen}
            onClick={() => {
              if (inNri) navigate(items.find((i) => i.to === '/dashboard')?.to || items[0].to);
              else setCollapsed((c) => !c);
            }}
          />
        )}
        {kycOpen && <NavItems items={items} />}
        {hasNri && (
          <SectionHeader
            label="NRE - NRO"
            active={inNri}
            open={nriOpen}
            onClick={() => {
              if (!inNri) navigate('/nri/dashboard');
              else setCollapsed((c) => !c);
            }}
          />
        )}
        {nriOpen && <NavItems items={NRI_ITEMS} />}
      </ul>
    </aside>
  );
}
