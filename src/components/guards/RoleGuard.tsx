import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { hasPermission } from '../../lib/permissions';
import type { UserRole } from '../../types/user';

interface RoleGuardProps {
  /** Minimum role required to access this route */
  minRole: UserRole;
  children: React.ReactNode;
}

/**
 * Route guard that checks both authentication and role-based authorization.
 * 
 * - If not authenticated → redirects to /login
 * - If authenticated but insufficient role → redirects to /forbidden
 * - Otherwise → renders children
 *
 * Usage in App.tsx:
 *   <RoleGuard minRole="admin"><AdminPanel /></RoleGuard>
 *   <RoleGuard minRole="supervisor"><ReportApprovals /></RoleGuard>
 */
export function RoleGuard({ minRole, children }: RoleGuardProps) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user || !hasPermission(user.role, minRole)) {
    return <Navigate to="/forbidden" replace />;
  }

  return <>{children}</>;
}
