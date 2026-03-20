/**
 * Permission Helper Functions
 */

import type { UserRole, AppModule, ModulePermissions } from '../types/user';
import { MODULE_DEFAULTS } from '../types/user';

/**
 * Check if a user role has the required permission (role hierarchy)
 */
export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    admin: 3,
    supervisor: 2,
    operator: 1,
  };
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

export function canAccessAdmin(userRole?: UserRole): boolean {
  if (!userRole) return false;
  return userRole === 'admin';
}

export function canAccessSupervisor(userRole?: UserRole): boolean {
  if (!userRole) return false;
  return userRole === 'admin' || userRole === 'supervisor';
}

export function canViewAllReports(userRole?: UserRole): boolean {
  return canAccessSupervisor(userRole);
}

export function canApproveReports(userRole?: UserRole): boolean {
  return canAccessSupervisor(userRole);
}

export function canManageUsers(userRole?: UserRole): boolean {
  return canAccessAdmin(userRole);
}

export function canConfigureSystem(userRole?: UserRole): boolean {
  return canAccessAdmin(userRole);
}

// ============================================================================
// Module-level access (granular per-user permissions)
// ============================================================================

/**
 * Resolve a single module permission from overrides or role defaults.
 */
function resolveModulePerm(
  user: { role: UserRole; modulePermissions?: ModulePermissions },
  module: AppModule,
): boolean {
  if (user.modulePermissions) {
    return user.modulePermissions[module] ?? MODULE_DEFAULTS[user.role][module];
  }
  return MODULE_DEFAULTS[user.role][module];
}

/**
 * Check if a user has access to a specific application module.
 *
 * - Admin → always true
 * - Otherwise → direct permission check
 */
export function canAccessModule(
  user: { role: UserRole; modulePermissions?: ModulePermissions } | null | undefined,
  module: AppModule,
): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return resolveModulePerm(user, module);
}

/**
 * Check if a user can view individual reports (ReportView).
 * Granted if the user has 'reports' OR 'approvals' permission.
 * (Approvals users need to view reports to approve them.)
 */
export function canViewReport(
  user: { role: UserRole; modulePermissions?: ModulePermissions } | null | undefined,
): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return resolveModulePerm(user, 'reports') || resolveModulePerm(user, 'approvals');
}

/**
 * Get user-friendly role name
 */
export function getRoleName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    admin: 'Administrador',
    supervisor: 'Supervisor',
    operator: 'Operador',
  };
  return roleNames[role];
}
