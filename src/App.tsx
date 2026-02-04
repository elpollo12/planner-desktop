import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ReportForm from './pages/ReportForm';
import ReportList from './pages/ReportList';
import ReportView from './pages/ReportView';
import AdminPanel from './pages/AdminPanel';
import TestArea from './pages/TestArea';
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
  return (
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

        <Route
        path="/test"
        element={
          <ProtectedRoute>
            <TestArea />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
