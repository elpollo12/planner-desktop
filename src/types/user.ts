export type UserRole = 'operator' | 'supervisor' | 'admin';

// ============================================================================
// Module Permissions (granular per-user access)
// ============================================================================

export const APP_MODULES = [
  'dashboard', 'reports', 'approvals',
  'logistics', 'incidents', 'admin',
] as const;

export type AppModule = typeof APP_MODULES[number];

export const MODULE_LABELS: Record<AppModule, string> = {
  dashboard: 'Dashboard',
  reports: 'Reportes',
  approvals: 'Aprobaciones',
  logistics: 'Logística',
  incidents: 'Incidencias',
  admin: 'Administración',
};

/**
 * Modules shown in admin permissions UI.
 * 'admin' is excluded — only the admin role grants admin access.
 */
export const PERMISSION_MODULES: AppModule[] = [
  'dashboard', 'reports', 'approvals', 'logistics', 'incidents',
];

/** Default module access per role. Must stay in sync with backend (module_permission.rs). */
export const MODULE_DEFAULTS: Record<UserRole, Record<AppModule, boolean>> = {
  operator: {
    dashboard: true,
    reports: true,
    approvals: false,
    logistics: true,
    incidents: true,
    admin: false,
  },
  supervisor: {
    dashboard: true,
    reports: true,
    approvals: true,
    logistics: true,
    incidents: true,
    admin: false,
  },
  admin: {
    dashboard: true,
    reports: true,
    approvals: true,
    logistics: true,
    incidents: true,
    admin: true,
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

// Permisos por rol
export const ROLE_PERMISSIONS = {
  operator: {
    canViewOwnReports: true,
    canCreateReports: true,
    canEditOwnReports: true,
    canViewAllReports: false,
    canEditAnyReport: false,
    canApproveReports: false,
    canManageUsers: false,
    canConfigureSystem: false,
    canExportData: false,
  },
  supervisor: {
    canViewOwnReports: true,
    canCreateReports: true,
    canEditOwnReports: true,
    canViewAllReports: true,
    canEditAnyReport: true,
    canApproveReports: true,
    canManageUsers: false,
    canConfigureSystem: false,
    canExportData: true,
  },
  admin: {
    canViewOwnReports: true,
    canCreateReports: true,
    canEditOwnReports: true,
    canViewAllReports: true,
    canEditAnyReport: true,
    canApproveReports: true,
    canManageUsers: true,
    canConfigureSystem: true,
    canExportData: true,
  },
} as const;

export type Permission = keyof typeof ROLE_PERMISSIONS.admin;
