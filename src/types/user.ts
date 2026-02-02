export type UserRole = 'operator' | 'supervisor' | 'admin';

export interface User {
  id: string;
  username: string;
  fullName: string;
  ci?: string;
  role: UserRole;
  position?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
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
}

export interface UpdateUserInput {
  fullName?: string;
  ci?: string;
  role?: UserRole;
  position?: string;
  active?: boolean;
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
