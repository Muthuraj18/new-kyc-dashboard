import { NavLink } from 'react-router-dom';
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
} from './icons';
import useFeatures from '../hooks/useFeatures';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', Icon: DashboardIcon },
  { to: '/clients', label: 'Clients', Icon: ClientsIcon },
  { to: '/payments', label: 'Payments', Icon: PaymentsIcon },
  { to: '/kyc-status', label: 'KYC Status', Icon: KycStatusIcon },
  { to: '/integrations', label: 'Integrations', Icon: IntegrationsIcon },
  { to: '/user-management', label: 'User Management', Icon: UserManagementIcon },
  { to: '/upload', label: 'Upload', Icon: UploadIcon },
  { to: '/audit-logs', label: 'Audit Logs', Icon: AuditLogsIcon, feature: 'auditLogs' },
  { to: '/trash', label: 'Trash', Icon: TrashIcon, feature: 'trash' },
];

export default function Sidebar() {
  const features = useFeatures();
  const items = NAV_ITEMS.filter((item) => !item.feature || features[item.feature]);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img className="brand-logo" src="/aionion-logo.png" alt="AIONION Capital" />
        <div className="sidebar-brand-text">
          {/* <div className="subtitle">KYC Operations</div> */}
        </div>
      </div>

      <ul className="nav-list">
        {items.map(({ to, label, Icon }) => (
          <li key={to}>
            <NavLink to={to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Icon />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </aside>
  );
}
