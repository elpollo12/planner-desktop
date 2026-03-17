import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuthStore } from './store/authStore';
import { useLicenseStore } from './store/licenseStore';
import { usePreferencesStore } from './store/preferencesStore';
import { useAppSettingsStore } from './store/appSettingsStore';
import { useThemeApplicator, applyThemeToDOM } from './hooks/useThemeApplicator';
import { useAutoSync } from './hooks/useAutoSync';
import { useConnectionPing } from './hooks/useConnectionPing';
import { useUnreadCount, notificationKeys } from './hooks/useNotifications';
import { syncEvents } from './lib/syncEvents';
import { queryClient } from './lib/queryClient';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ReportForm from './pages/ReportForm';
import ReportList from './pages/ReportList';
import ReportView from './pages/ReportView';
import AdminPanel from './pages/AdminPanel';
import { UpdateNotification } from './components/ui/UpdateNotification';
import Logistics from './pages/Logistics';
import Incidents from './pages/Incidents';
import CloudLogs from './pages/CloudLogs';
import ReportApprovals from './pages/ReportApprovals';
import LicenseActivation from './pages/LicenseActivation';
import Forbidden from './pages/Forbidden';
import Profile from './pages/Profile';
import { RoleGuard } from './components/guards';
import { canViewReport } from './lib/permissions';
import './App.css';

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  const { sessionToken, getCurrentUser, isAuthenticated } = useAuthStore();
  const { isLicensed, isLoading: licenseLoading, checkLicense, activationInProgress } = useLicenseStore();
  const { loadPreferences, clearPreferences } = usePreferencesStore();
  const { loadSettings } = useAppSettingsStore();
  const [validating, setValidating] = useState(true);

  // Check license on startup — LicenseActivation maneja su propio ciclo completo
  useEffect(() => {
    checkLicense();
  }, []);

  // Apply theme reactively whenever preferences change
  useThemeApplicator();

  // Auto-sync with planner-sync server
  useAutoSync();

  // Periodic connection ping (every 30s)
  useConnectionPing();

  // Poll unread notifications count (every 30s while authenticated)
  useUnreadCount();

  // Load company settings on startup (public, no auth required)
  useEffect(() => {
    loadSettings().catch((error) => {
      console.error('Error loading company settings:', error);
    });
  }, []);

  // Reload company settings after any sync (so all users get admin's branding)
  useEffect(() => {
    const unsubscribe = syncEvents.subscribe(() => {
      loadSettings()
        .then(() => {
          const appSettings = useAppSettingsStore.getState().settings;
          const preferences = usePreferencesStore.getState().preferences;
          const primaryColor = appSettings?.primaryColor ?? '#1e3a5f';
          const secondaryColor = appSettings?.secondaryColor ?? '#f97316';
          const themeMode = preferences?.themeMode ?? 'light';
          applyThemeToDOM({ primaryColor, secondaryColor, themeMode });
        })
        .catch((error) => {
          console.error('Error reloading settings after sync:', error);
        });
      queryClient.invalidateQueries({ queryKey: notificationKeys.all() });
    });
    return unsubscribe;
  }, []);

  // Validate session on startup
  useEffect(() => {
    if (sessionToken) {
      getCurrentUser().finally(() => setValidating(false));
    } else {
      setValidating(false);
    }
  }, []);

  // Load preferences whenever we have a valid session, clear on logout
  useEffect(() => {
    if (isAuthenticated && sessionToken) {
      loadPreferences(sessionToken);
    } else {
      clearPreferences();
    }
  }, [isAuthenticated, sessionToken]);

  if ((licenseLoading && !activationInProgress) || validating) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  // TODO: REACTIVAR licencias antes del release final
  // if (!isLicensed || activationInProgress) {
  //   return <LicenseActivation />;
  // }

  return (
    <>
      {isAuthenticated && <UpdateNotification />}
      <ToastContainer
        position="bottom-right"
        autoClose={2000}
        hideProgressBar={true}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<RoleGuard module="dashboard"><Dashboard /></RoleGuard>} />
        <Route path="/reports/new" element={<RoleGuard module="reports"><ReportForm /></RoleGuard>} />
        <Route path="/reports/edit/:id" element={<RoleGuard module="reports"><ReportForm /></RoleGuard>} />
        <Route path="/reports/view/:id" element={<RoleGuard check={canViewReport}><ReportView /></RoleGuard>} />
        <Route path="/reports" element={<RoleGuard module="reports"><ReportList /></RoleGuard>} />
        <Route path="/approvals" element={<RoleGuard module="approvals"><ReportApprovals /></RoleGuard>} />
        <Route path="/admin" element={<RoleGuard module="admin"><AdminPanel /></RoleGuard>} />
        <Route path="/logistics" element={<RoleGuard module="logistics"><Logistics /></RoleGuard>} />
        <Route path="/incidents" element={<RoleGuard module="incidents"><Incidents /></RoleGuard>} />
        <Route path="/cloud-logs" element={<RoleGuard module="cloud-logs"><CloudLogs /></RoleGuard>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/forbidden" element={<Forbidden />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}

export default App;
