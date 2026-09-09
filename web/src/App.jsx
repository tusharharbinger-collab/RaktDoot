import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { LanguageProvider } from './context/LanguageContext';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/LoginPage';
import ManagerMapPage from './pages/ManagerMapPage';
import ManagerDestinationsPage from './pages/ManagerDestinationsPage';
import ManagerNotificationsPage from './pages/ManagerNotificationsPage';
import ManagerIssuesPage from './pages/ManagerIssuesPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminTelemetryPage from './pages/AdminTelemetryPage';
import SettingsPage from './pages/SettingsPage';

function DefaultRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin/users" replace />;
  if (user.role === 'manager') return <Navigate to="/manager/map" replace />;
  return <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppShell />}>
          <Route index element={<DefaultRedirect />} />
          <Route path="/manager/map" element={<ManagerMapPage />} />
          <Route path="/manager/destinations" element={<ManagerDestinationsPage />} />
          <Route path="/manager/notifications" element={<ManagerNotificationsPage />} />
          <Route path="/manager/issues" element={<ManagerIssuesPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/telemetry" element={<AdminTelemetryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <SocketProvider>
          <AppRoutes />
        </SocketProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
