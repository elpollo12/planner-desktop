export type UserRole = 'operator' | 'supervisor' | 'admin';

// ============================================================================
// Module Permissions (granular per-user access)
// ============================================================================

// MUST stay in sync with `VALID_MODULES` in src-tauri/src/models/module_permission.rs.
export const APP_MODULES = [
  'dashboard', 'reports', 'approvals',
  'logistics', 'incidents', 'admin', 'cloud-logs',
] as const;

export type AppModule = typeof APP_MODULES[number];

export const MODULE_LABELS: Record<AppModule, string> = {
  dashboard: 'Dashboard',
  reports: 'Reportes',
  approvals: 'Aprobaciones',
  logistics: 'Logística',
  incidents: 'Incidencias',
  admin: 'Administración',
  'cloud-logs': 'Registros Diarios',
};

/**
 * Modules shown in admin permissions UI.
 * 'admin' is excluded — only the admin role grants admin access.
 * Derived from APP_MODULES so adding a new module here automatically
 * surfaces it in the permissions UI.
 */
export const PERMISSION_MODULES: AppModule[] = APP_MODULES.filter((m) => m !== 'admin' && m !== 'dashboard');

/**
 * UI fallback defaults — used only when `modulePermissions` hasn't been loaded yet
 * (e.g. loading state, or admin users who skip the getMine() call).
 *
 * At runtime, non-admin users always have `modulePermissions` populated from the
 * backend (`get_my_module_permissions`), which is the authoritative source.
 *
 * MUST stay in sync with `role_defaults()` in src-tauri/src/models/module_permission.rs.
 */
export const MODULE_DEFAULTS: Record<UserRole, Record<AppModule, boolean>> = {
  operator: {
    dashboard: true,
    reports: true,
    approvals: false,
    logistics: true,
    incidents: true,
    admin: false,
    'cloud-logs': true,
  },
  supervisor: {
    dashboard: true,
    reports: true,
    approvals: true,
    logistics: true,
    incidents: true,
    admin: false,
    'cloud-logs': true,
  },
  admin: {
    dashboard: true,
    reports: true,
    approvals: true,
    logistics: true,
    incidents: true,
    admin: true,
    'cloud-logs': true,
  },
};

export type ModulePermissions = Record<AppModule, boolean>;

export interface User {
  id: string;
  username: string;
  fullName: string;
  ci?: string;
  role: UserRole;
  position?: string;
  active: boolean;
  hasAllRigs: boolean;
  supervisorId?: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  /** Resolved module permissions (role defaults + overrides). Loaded after login. */
  modulePermissions?: ModulePermissions;
}

export interface UserWithRigs extends User {
  assignedRigIds: string[];
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  sessionToken: string;
  user: User;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface CreateUserInput {
  username: string;
  password: string;
  fullName: string;
  ci?: string;
  role: UserRole;
  position?: string;
  hasAllRigs?: boolean;
  assignedRigIds?: string[];
  supervisorId?: string;
}

export interface UpdateUserInput {
  fullName?: string;
  ci?: string;
  role?: UserRole;
  position?: string;
  active?: boolean;
  hasAllRigs?: boolean;
  assignedRigIds?: string[];
  supervisorId?: string | null;
}

