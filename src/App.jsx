import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import DigilockerResult from './pages/DigilockerResult';
import EsignResult from './pages/EsignResult';
import Payments from './pages/Payments';
import KycStatus from './pages/KycStatus';
import Integrations from './pages/Integrations';
import UserManagement from './pages/UserManagement';
import AuditLogs from './pages/AuditLogs';
import Trash from './pages/Trash';
import Upload from './pages/Upload';
import IntegrationTable from './pages/IntegrationTable';
import KycLogs from './pages/KycLogs';
import NeedAttention from './pages/NeedAttention';
// NRE - NRO section
import NriDashboard from './pages/nri/NriDashboard';
import NriApplications from './pages/nri/NriApplications';
import NriApplicationDetail from './pages/nri/NriApplicationDetail';
import NriIpv from './pages/nri/NriIpv';
import NriIpvDetail from './pages/nri/NriIpvDetail';
import NriBoid from './pages/nri/NriBoid';
import NriPayments from './pages/nri/NriPayments';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
      <Route path="/clients/:id" element={<ProtectedRoute><ClientDetail /></ProtectedRoute>} />
      <Route path="/clients/:id/digilocker-result" element={<ProtectedRoute><DigilockerResult /></ProtectedRoute>} />
      <Route path="/clients/:id/esign-result" element={<ProtectedRoute><EsignResult /></ProtectedRoute>} />
      <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
      <Route path="/kyc-status" element={<ProtectedRoute><KycStatus /></ProtectedRoute>} />
      <Route path="/integrations" element={<ProtectedRoute><Integrations /></ProtectedRoute>} />
      <Route path="/user-management" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
      <Route path="/audit-logs" element={<ProtectedRoute><AuditLogs /></ProtectedRoute>} />
      <Route path="/trash" element={<ProtectedRoute><Trash /></ProtectedRoute>} />
      <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
      <Route path="/kyc-logs" element={<ProtectedRoute><KycLogs /></ProtectedRoute>} />
      <Route path="/kyc-logs/:id" element={<ProtectedRoute><KycLogs /></ProtectedRoute>} />
      <Route path="/need-attention" element={<ProtectedRoute><NeedAttention /></ProtectedRoute>} />
      <Route path="/tables" element={<Navigate to="/tables/cvlkra" replace />} />
      <Route path="/tables/:table" element={<ProtectedRoute><IntegrationTable /></ProtectedRoute>} />

      {/* NRE - NRO */}
      <Route path="/nri" element={<Navigate to="/nri/dashboard" replace />} />
      <Route path="/nri/dashboard" element={<ProtectedRoute><NriDashboard /></ProtectedRoute>} />
      <Route path="/nri/applications" element={<ProtectedRoute><NriApplications /></ProtectedRoute>} />
      <Route path="/nri/applications/:type/:id" element={<ProtectedRoute><NriApplicationDetail /></ProtectedRoute>} />
      <Route path="/nri/ipv" element={<ProtectedRoute><NriIpv /></ProtectedRoute>} />
      <Route path="/nri/ipv/:id" element={<ProtectedRoute><NriIpvDetail /></ProtectedRoute>} />
      <Route path="/nri/boid" element={<ProtectedRoute><NriBoid /></ProtectedRoute>} />
      <Route path="/nri/payments" element={<ProtectedRoute><NriPayments /></ProtectedRoute>} />

      <Route path="/" element={<Navigate to="/clients" replace />} />
      <Route path="*" element={<Navigate to="/clients" replace />} />
    </Routes>
  );
}
