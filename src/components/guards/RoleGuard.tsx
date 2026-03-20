import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { hasPermission, canAccessModule } from '../../lib/permissions';
import type { UserRole, AppModule } from '../../types/user';
import type { User } from '../../types/user';

interface RoleGuardProps {
  /** Minimum role required (legacy check, still works) */
  minRole?: UserRole;
  /** Module access check (new granular system) */
  module?: AppModule;
  /** Custom check function for complex rules (e.g. canViewReport) */
  check?: (user: User) => boolean;
  children: React.ReactNode;
}

/**
 * Route guard that checks authentication and authorization.
 *
 * Supports three modes (can be combined — all must pass):
 *   - `module`: Uses the granular per-user permission system.
 *   - `minRole` (legacy): Uses the role hierarchy.
 *   - `check`: Custom predicate for complex access rules.
 *
 * - Not authenticated → /login
 * - Authenticated but unauthorized → /forbidden
 * - Otherwise → renders children
 */
export function RoleGuard({ minRole, module, check, children }: RoleGuardProps) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Module-based check
  if (module && (!user || !canAccessModule(user, module))) {
    return <Navigate to="/forbidden" replace />;
  }

  // Custom check
  if (check && (!user || !check(user))) {
    return <Navigate to="/forbidden" replace />;
  }

  // Role hierarchy check (legacy)
  if (minRole && (!user || !hasPermission(user.role, minRole))) {
    return <Navigate to="/forbidden" replace />;
  }

  return <>{children}</>;
}
