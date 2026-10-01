import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Payments from './pages/Payments';
import KycStatus from './pages/KycStatus';
import Integrations from './pages/Integrations';
import UserManagement from './pages/UserManagement';
import AuditLogs from './pages/AuditLogs';
import Trash from './pages/Trash';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
      <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
      <Route path="/kyc-status" element={<ProtectedRoute><KycStatus /></ProtectedRoute>} />
      <Route path="/integrations" element={<ProtectedRoute><Integrations /></ProtectedRoute>} />
      <Route path="/user-management" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
      <Route path="/audit-logs" element={<ProtectedRoute><AuditLogs /></ProtectedRoute>} />
      <Route path="/trash" element={<ProtectedRoute><Trash /></ProtectedRoute>} />

      <Route path="/" element={<Navigate to="/clients" replace />} />
      <Route path="*" element={<Navigate to="/clients" replace />} />
    </Routes>
  );
}
