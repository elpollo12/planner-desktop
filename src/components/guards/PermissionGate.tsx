import { usePermissions } from '@/hooks/usePermissions';
import { useAuthStore } from '@/store/authStore';
import type { AppModule, UserRole, User } from '@/types/user';

interface PermissionGateProps {
  /** Module access check (granular per-user permission) */
  module?: AppModule;
  /** Minimum role required (role hierarchy check) */
  minRole?: UserRole;
  /** Custom predicate for complex rules (e.g. canViewReport) */
  check?: (user: User) => boolean;
  /** Rendered when access is denied. Defaults to null (hidden). */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Inline permission gate for UI elements.
 *
 * Unlike RoleGuard (which redirects), PermissionGate simply hides its children
 * when the user lacks access. Use this to conditionally render buttons, cards,
 * links, tabs, or any element that should not be visible to unauthorized users.
 *
 * Supports the same three modes as RoleGuard (all provided conditions must pass):
 *   - `module`  → granular per-user module check
 *   - `minRole` → role hierarchy check
 *   - `check`   → custom predicate
 *
 * @example
 * // Hide button for users without 'approvals' access
 * <PermissionGate module="approvals">
 *   <Button onClick={() => navigate('/approvals')}>Aprobaciones</Button>
 * </PermissionGate>
 *
 * @example
 * // Show a disabled fallback instead of hiding
 * <PermissionGate module="admin" fallback={<Button disabled>Admin</Button>}>
 *   <Button onClick={() => navigate('/admin')}>Admin</Button>
 * </PermissionGate>
 *
 * @example
 * // Custom predicate
 * <PermissionGate check={canViewReport}>
 *   <Link to={`/reports/view/${id}`}>Ver reporte</Link>
 * </PermissionGate>
 */
export function PermissionGate({
  module,
  minRole,
  check,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { module: checkModule } = usePermissions();
  const user = useAuthStore((s) => s.user);

  // Not logged in → hide everything
  if (!user) return <>{fallback}</>;

  // Module check
  if (module !== undefined && !checkModule(module)) {
    return <>{fallback}</>;
  }

  // Role hierarchy check
  if (minRole !== undefined) {
    const hierarchy: Record<UserRole, number> = { admin: 3, supervisor: 2, operator: 1 };
    if (hierarchy[user.role] < hierarchy[minRole]) {
      return <>{fallback}</>;
    }
  }

  // Custom predicate
  if (check !== undefined && !check(user)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
