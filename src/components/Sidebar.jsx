import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
} from './icons';
import useFeatures from '../hooks/useFeatures';
import { useAuth } from '../context/AuthContext';

// Integration tables editable from the Tables menu (keys match GET /api/tables).
export const INTEGRATION_TABLES = [
  { key: 'cvlkra', label: 'CVLKRA' },
  { key: 'cdsl', label: 'CDSL' },
  { key: 'nse', label: 'NSE' },
  { key: 'bse', label: 'BSE' },
  { key: 'techexcel', label: 'TECHEXCEL' },
];

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', Icon: DashboardIcon },
  { to: '/clients', label: 'Clients', Icon: ClientsIcon },
  { to: '/need-attention', label: 'Need Attention', Icon: AlertIcon, roles: ['Super Admin', 'Admin'] },
  { to: '/payments', label: 'Payments', Icon: PaymentsIcon },
  { to: '/kyc-status', label: 'KYC Status', Icon: KycStatusIcon },
  { to: '/integrations', label: 'Integrations', Icon: IntegrationsIcon },
  {
    to: '/tables',
    label: 'Tables',
    Icon: TableIcon,
    roles: ['Super Admin', 'Admin'],
    children: INTEGRATION_TABLES.map((t) => ({ to: `/tables/${t.key}`, label: t.label })),
  },
  { to: '/kyc-logs', label: 'KYC Logs', Icon: LogsIcon, roles: ['Super Admin', 'Admin'] },
  { to: '/user-management', label: 'User Management', Icon: UserManagementIcon },
  { to: '/upload', label: 'Upload', Icon: UploadIcon },
  { to: '/audit-logs', label: 'Audit Logs', Icon: AuditLogsIcon, feature: 'auditLogs', roles: ['Super Admin'] },
  { to: '/trash', label: 'Trash', Icon: TrashIcon, feature: 'trash', roles: ['Super Admin'] },
];

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
    && (!item.roles || item.roles.includes(user?.role)));

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img className="brand-logo" src="/aionion-logo.png" alt="AIONION Capital" />
        <div className="sidebar-brand-text">
          {/* <div className="subtitle">KYC Operations</div> */}
        </div>
      </div>

      <ul className="nav-list">
        {items.map((item) => (item.children ? (
          <NavGroup key={item.to} item={item} />
        ) : (
          <li key={item.to}>
            <NavLink to={item.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <item.Icon />
              <span>{item.label}</span>
            </NavLink>
          </li>
        )))}
      </ul>
    </aside>
  );
}
