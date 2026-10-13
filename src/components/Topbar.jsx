import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SunMoonIcon } from './icons';
import NotificationBell from './NotificationBell';

function getInitialTheme() {
  return localStorage.getItem('kyc_theme') || 'light';
}

export default function Topbar({ title }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(getInitialTheme);

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
        <button className="btn btn-outline" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}
