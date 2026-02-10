import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuthStore } from './store/authStore';
import { usePreferencesStore } from './store/preferencesStore';
import { useThemeApplicator } from './hooks/useThemeApplicator';
import { useAutoSync } from './hooks/useAutoSync';
import { backgroundPull } from './lib/syncHelper';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ReportForm from './pages/ReportForm';
import ReportList from './pages/ReportList';
import ReportView from './pages/ReportView';
import AdminPanel from './pages/AdminPanel';
import './App.css';

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { sessionToken, getCurrentUser, isAuthenticated } = useAuthStore();
  const { loadPreferences, clearPreferences } = usePreferencesStore();
  const [validating, setValidating] = useState(true);

  // Apply theme reactively whenever preferences change
  useThemeApplicator();

  // Auto-sync with Turso cloud (for admin users)
  useAutoSync();

  // Validate session on startup and pull latest data from cloud
  useEffect(() => {
    if (sessionToken) {
      getCurrentUser()
        .then(() => {
          // After successful auth, pull latest data from cloud
          backgroundPull(sessionToken);
        })
        .finally(() => setValidating(false));
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

  if (validating) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <>
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
      
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/reports/new"
        element={
          <ProtectedRoute>
            <ReportForm />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/reports/edit/:id"
        element={
          <ProtectedRoute>
            <ReportForm />
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports/view/:id"
        element={
          <ProtectedRoute>
            <ReportView />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <ReportList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminPanel />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}

export default App;
