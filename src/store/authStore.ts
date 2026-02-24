import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, LoginResponse, ModulePermissions } from '../types';
import { invoke } from '@tauri-apps/api/core';
import { modulePermissionsApi } from '../lib/api';
import { useLogisticsStore } from './logisticsStore';
import { queryClient } from '../lib/queryClient';

interface AuthState {
  user: User | null;
  sessionToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<void>;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      sessionToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await invoke<LoginResponse>('login', {
            username,
            password,
          });

          // Load granular module permissions for non-admin users
          let modulePermissions: ModulePermissions | undefined;
          if (response.user.role !== 'admin') {
            try {
              modulePermissions = await modulePermissionsApi.getMine(
                response.sessionToken,
              ) as ModulePermissions;
            } catch (e) {
              console.error('Failed to load module permissions:', e);
            }
          }

          set({
            user: { ...response.user, modulePermissions },
            sessionToken: response.sessionToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const rawError = error as string;
          // Map backend error messages to user-friendly Spanish messages
          let errorMessage = rawError;
          if (rawError.includes('User account is disabled')) {
            errorMessage = 'Tu cuenta está desactivada. Contacta al administrador para más información.';
          } else if (rawError.includes('Invalid password')) {
            errorMessage = 'Contraseña incorrecta.';
          } else if (rawError.includes('Authentication failed')) {
            errorMessage = 'Credenciales inválidas. Verifica tu usuario y contraseña.';
          }
          set({
            user: null,
            sessionToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      logout: async () => {
        const { sessionToken } = get();
        if (sessionToken) {
          try {
            await invoke('logout', { sessionToken });
          } catch (error) {
            console.error('Logout error:', error);
          }
        }

        set({
          user: null,
          sessionToken: null,
          isAuthenticated: false,
          error: null,
        });

        // Clear logistics rig selection on logout
        useLogisticsStore.getState().clearSelectedRig();

        // Clear all React Query cache to prevent stale data leaking between users
        queryClient.clear();
      },

      getCurrentUser: async () => {
        const { sessionToken } = get();
        if (!sessionToken) {
          set({ isAuthenticated: false, user: null });
          return;
        }

        set({ isLoading: true });
        try {
          const user = await invoke<User>('get_current_user', { sessionToken });

          // If the user account was deactivated, force logout
          if (!user.active) {
            set({
              user: null,
              sessionToken: null,
              isAuthenticated: false,
              isLoading: false,
              error: 'Tu cuenta ha sido desactivada. Contacta al administrador.',
            });
            return;
          }

          // Load granular module permissions for non-admin users
          let modulePermissions: ModulePermissions | undefined;
          if (user.role !== 'admin') {
            try {
              modulePermissions = await modulePermissionsApi.getMine(sessionToken)  as ModulePermissions;
            } catch (e) {
              console.error('Failed to load module permissions:', e);
            }
          }

          set({
            user: { ...user, modulePermissions },
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            user: null,
            sessionToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: error as string,
          });
        }
      },

      setError: (error: string | null) => {
        set({ error });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        sessionToken: state.sessionToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
