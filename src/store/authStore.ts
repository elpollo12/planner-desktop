import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole, Permission, ROLE_PERMISSIONS } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Acciones
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;

  // Helpers de permisos
  hasPermission: (permission: Permission) => boolean;
  hasRole: (roles: UserRole[]) => boolean;
}

const PERMISSIONS: Record<UserRole, Record<Permission, boolean>> = {
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
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        }),

      setLoading: (isLoading) => set({ isLoading }),

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        }),

      hasPermission: (permission) => {
        const { user } = get();
        if (!user) return false;
        return PERMISSIONS[user.role][permission] ?? false;
      },

      hasRole: (roles) => {
        const { user } = get();
        if (!user) return false;
        return roles.includes(user.role);
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
