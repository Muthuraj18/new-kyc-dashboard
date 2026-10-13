// Small inline SVG icon set used across the sidebar and UI, kept dependency-free.
const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export const DashboardIcon = (props) => (
  <svg viewBox="0 0 24 24" className="nav-icon" {...base} {...props}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </svg>
);

export const ClientsIcon = (props) => (
  <svg viewBox="0 0 24 24" className="nav-icon" {...base} {...props}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    <circle cx="17.5" cy="9" r="2.5" />
    <path d="M15.5 14.2c2.6.4 4.5 2.6 4.5 5.3" />
  </svg>
);

export const PaymentsIcon = (props) => (
  <svg viewBox="0 0 24 24" className="nav-icon" {...base} {...props}>
    <rect x="2.5" y="5" width="19" height="14" rx="2" />
    <path d="M2.5 10h19" />
    <path d="M6 15h4" />
  </svg>
);

export const KycStatusIcon = (props) => (
  <svg viewBox="0 0 24 24" className="nav-icon" {...base} {...props}>
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path d="M8 12.5l2.5 2.5L16 9.5" />
  </svg>
);

export const IntegrationsIcon = (props) => (
  <svg viewBox="0 0 24 24" className="nav-icon" {...base} {...props}>
    <path d="M9 15L15 9" />
    <path d="M11 5.5l1-1a3.5 3.5 0 015 5l-1 1" />
    <path d="M13 18.5l-1 1a3.5 3.5 0 01-5-5l1-1" />
  </svg>
);

export const UserManagementIcon = (props) => (
  <svg viewBox="0 0 24 24" className="nav-icon" {...base} {...props}>
    <circle cx="12" cy="8" r="3.2" />
    <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
    <circle cx="12" cy="8" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const AuditLogsIcon = (props) => (
  <svg viewBox="0 0 24 24" className="nav-icon" {...base} {...props}>
    <path d="M6 3h9l4 4v14a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z" />
    <path d="M9 11h6M9 15h6M9 7h3" />
  </svg>
);

export const TrashIcon = (props) => (
  <svg viewBox="0 0 24 24" className="nav-icon" {...base} {...props}>
    <path d="M4 7h16" />
    <path d="M9 7V4.5A1.5 1.5 0 0110.5 3h3A1.5 1.5 0 0115 4.5V7" />
    <path d="M6 7l1 13a1.5 1.5 0 001.5 1.4h7A1.5 1.5 0 0017 20l1-13" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

export const SunMoonIcon = (props) => (
  <svg viewBox="0 0 24 24" width="15" height="15" {...base} {...props}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
  </svg>
);

export const CopyIcon = (props) => (
  <svg viewBox="0 0 24 24" width="12" height="12" {...base} {...props}>
    <rect x="9" y="9" width="11" height="11" rx="1.5" />
    <path d="M5 15V5a1.5 1.5 0 011.5-1.5H15" />
  </svg>
);

export const GearIcon = (props) => (
  <svg viewBox="0 0 24 24" width="14" height="14" {...base} {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 13a7.6 7.6 0 000-2l2-1.6-2-3.5-2.4.7a7.6 7.6 0 00-1.7-1l-.4-2.5H10.1l-.4 2.5a7.6 7.6 0 00-1.7 1l-2.4-.7-2 3.5L5.6 11a7.6 7.6 0 000 2l-2 1.6 2 3.5 2.4-.7a7.6 7.6 0 001.7 1l.4 2.5h3.8l.4-2.5a7.6 7.6 0 001.7-1l2.4.7 2-3.5z" />
  </svg>
);

// ---- Client detail page (pin, preview toolbar, info, caret) ----
export const PinIcon = (props) => (
  <svg viewBox="0 0 24 24" className="ui-icon" {...base} {...props}>
    <path d="M14 4l6 6-3 1-4 4-1 4-6-6 4-1 4-4z" />
    <path d="M9 15l-5 5" />
  </svg>
);

export const ZoomInIcon = (props) => (
  <svg viewBox="0 0 24 24" className="ui-icon" {...base} {...props}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4.2-4.2M11 8v6M8 11h6" />
  </svg>
);

export const ZoomOutIcon = (props) => (
  <svg viewBox="0 0 24 24" className="ui-icon" {...base} {...props}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4.2-4.2M8 11h6" />
  </svg>
);

export const RotateLeftIcon = (props) => (
  <svg viewBox="0 0 24 24" className="ui-icon" {...base} {...props}>
    <path d="M4 5v5h5" />
    <path d="M5.5 15a7 7 0 1 0 1-7.5L4 10" />
  </svg>
);

export const RotateRightIcon = (props) => (
  <svg viewBox="0 0 24 24" className="ui-icon" {...base} {...props}>
    <path d="M20 5v5h-5" />
    <path d="M18.5 15a7 7 0 1 1-1-7.5L20 10" />
  </svg>
);

export const ExpandIcon = (props) => (
  <svg viewBox="0 0 24 24" className="ui-icon" {...base} {...props}>
    <path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7" />
  </svg>
);

export const InfoIcon = (props) => (
  <svg viewBox="0 0 24 24" className="ui-icon" {...base} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </svg>
);

export const CaretDownIcon = (props) => (
  <svg viewBox="0 0 24 24" className="ui-icon" fill="currentColor" {...props}>
    <path d="M6 9h12l-6 7z" />
  </svg>
);

export const PencilIcon = (props) => (
  <svg viewBox="0 0 24 24" className="ui-icon" {...base} {...props}>
    <path d="M4 20h4L19 9l-4-4L4 16z" />
    <path d="M13.5 6.5l4 4" />
  </svg>
);

export const UploadIcon = (props) => (
  <svg viewBox="0 0 24 24" className="nav-icon" {...base} {...props}>
    <path d="M12 15V4" />
    <path d="M7.5 8.5 12 4l4.5 4.5" />
    <path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" />
  </svg>
);

export const BellIcon = (props) => (
  <svg viewBox="0 0 24 24" className="nav-icon" {...base} {...props}>
    <path d="M6 9.5a6 6 0 0 1 12 0c0 4.5 1.8 6 1.8 6H4.2s1.8-1.5 1.8-6" />
    <path d="M10.2 19a2 2 0 0 0 3.6 0" />
  </svg>
);
