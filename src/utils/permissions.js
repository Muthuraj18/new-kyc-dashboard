// Mirror of the backend's module permissions (src/utils/permissions.js there), used to hide
// menu items and buttons. The backend is what actually enforces them.
export const MODULES = [
  { key: 'dashboard', label: 'Dashboard', levels: ['view'] },
  { key: 'clients', label: 'Clients', levels: ['view', 'edit', 'delete'] },
  { key: 'need_attention', label: 'Need Attention', levels: ['view'] },
  { key: 'payments', label: 'Payments', levels: ['view'] },
  { key: 'kyc_status', label: 'KYC Status', levels: ['view'] },
  { key: 'integrations', label: 'Integrations', levels: ['view'] },
  { key: 'tables', label: 'Tables', levels: ['view', 'edit'] },
  { key: 'kyc_logs', label: 'KYC Logs', levels: ['view'] },
  { key: 'user_management', label: 'User Management', levels: ['view'] },
  { key: 'upload', label: 'Upload', levels: ['view', 'edit'] },
  { key: 'audit_logs', label: 'Audit Logs', levels: ['view'] },
  { key: 'trash', label: 'Trash', levels: ['view'] },
];
export const LEVELS = ['view', 'edit', 'delete'];
const ADMIN_DENIED = { audit_logs: LEVELS, trash: LEVELS };

export function can(user, module, level = 'view') {
  if (!user) return false;
  if (user.role === 'Super Admin') return true;
  if (user.role === 'Admin') return !(ADMIN_DENIED[module] || []).includes(level);
  if (user.role === 'Agent') return (user.permissions?.[module] || []).includes(level);
  return false;
}
