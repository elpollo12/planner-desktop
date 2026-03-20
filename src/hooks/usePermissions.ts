import { useAuthStore } from '@/store/authStore';
import { canAccessModule, canViewReport, hasPermission } from '@/lib/permissions';
import type { AppModule } from '@/types/user';

/**
 * Hook that exposes all permission checks pre-bound to the current user.
 *
 * Usage:
 *   const { canAccess, is, module } = usePermissions();
 *
 *   canAccess.reports      → boolean (module-based, respects granular overrides)
 *   canAccess.viewReport   → boolean (reports OR approvals module)
 *   is.admin               → boolean
 *   is.supervisorOrAbove   → boolean
 *   module('logistics')    → boolean (dynamic module name)
 */
export function usePermissions() {
  const user = useAuthStore((s) => s.user);

  // ── Module access shortcuts ─────────────────────────────────────────────
  // Each property respects granular per-user overrides stored in modulePermissions.
  const canAccess = {
    dashboard:   canAccessModule(user, 'dashboard'),
    reports:     canAccessModule(user, 'reports'),
    approvals:   canAccessModule(user, 'approvals'),
    logistics:   canAccessModule(user, 'logistics'),
    incidents:   canAccessModule(user, 'incidents'),
    fluids:      canAccessModule(user, 'fluids'),
    admin:       canAccessModule(user, 'admin'),
    /** True if user has 'reports' OR 'approvals' (needed to view a report detail) */
    viewReport:  canViewReport(user),
  } as const;

  // ── Role shortcuts ───────────────────────────────────────────────────────
  const is = {
    admin:            user?.role === 'admin',
    supervisor:       user?.role === 'supervisor',
    operator:         user?.role === 'operator',
    supervisorOrAbove: user ? hasPermission(user.role, 'supervisor') : false,
  } as const;

  // ── Dynamic module check ─────────────────────────────────────────────────
  /** Use when the module name is a variable: module('reports') */
  function module(name: AppModule): boolean {
    return canAccessModule(user, name);
  }

  return { canAccess, is, module };
}
