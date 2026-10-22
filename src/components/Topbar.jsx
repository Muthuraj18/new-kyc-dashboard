import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SunMoonIcon } from './icons';
import NotificationBell from './NotificationBell';
import PasswordModal from './PasswordModal';

function getInitialTheme() {
  return localStorage.getItem('kyc_theme') || 'light';
}

export default function Topbar({ title }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(getInitialTheme);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState('');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('kyc_theme', theme);
  }, [theme]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="topbar">
      <h1>{title}</h1>
      <div className="topbar-actions">
        <NotificationBell />
        <button
          className="dark-toggle"
          onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        >
          <SunMoonIcon />
          {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
        </button>
        <span className="role-badge">{user?.role || 'Admin'}</span>
        <button className="btn btn-outline" onClick={() => setChangingPassword(true)} title="Change my password">
          {passwordNotice || 'Change password'}
        </button>
        <button className="btn btn-outline" onClick={handleLogout}>
          Logout
        </button>
      </div>
      {changingPassword && (
        <PasswordModal
          mode="self"
          onClose={() => setChangingPassword(false)}
          onDone={() => { setPasswordNotice('Password changed ✓'); setTimeout(() => setPasswordNotice(''), 4000); }}
        />
      )}
    </div>
  );
}
