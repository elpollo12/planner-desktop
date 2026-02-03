/**
 * Permission Helper Functions
 * 
 * Provides utilities to check user permissions based on roles
 */

import type { UserRole } from '../types/user';

/**
 * Check if a user role has the required permission
 * 
 * Permission hierarchy: Admin > Supervisor > Operator
 */
export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    admin: 3,
    supervisor: 2,
    operator: 1,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Check if user can access admin routes
 */
export function canAccessAdmin(userRole?: UserRole): boolean {
  if (!userRole) return false;
  return userRole === 'admin';
}

/**
 * Check if user can access supervisor routes
 */
export function canAccessSupervisor(userRole?: UserRole): boolean {
  if (!userRole) return false;
  return userRole === 'admin' || userRole === 'supervisor';
}

/**
 * Check if user can view all reports
 */
export function canViewAllReports(userRole?: UserRole): boolean {
  return canAccessSupervisor(userRole);
}

/**
 * Check if user can approve/reject reports
 */
export function canApproveReports(userRole?: UserRole): boolean {
  return canAccessSupervisor(userRole);
}

/**
 * Check if user can manage users
 */
export function canManageUsers(userRole?: UserRole): boolean {
  return canAccessAdmin(userRole);
}

/**
 * Check if user can configure system
 */
export function canConfigureSystem(userRole?: UserRole): boolean {
  return canAccessAdmin(userRole);
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
