import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '../lib/i18n';
import type { User, LoginResponse, ModulePermissions } from '../types';
import { invoke } from '@tauri-apps/api/core';
import { modulePermissionsApi } from '../lib/api';
import { useLogisticsStore } from './logisticsStore';
import { useConnectionStore } from './connectionStore';
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
            } catch {
              throw i18n.t('auth.errors.permissionsLoadFailed');
            }
          }

          set({
            user: { ...response.user, modulePermissions },
            sessionToken: response.sessionToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          // Check connection status after successful login (fire and forget)
          useConnectionStore.getState().checkConnection(response.sessionToken);
        } catch (error) {
          const rawError = error as string;
          // Map backend error messages to user-friendly translated messages
          let errorMessage = rawError;
          if (rawError.includes('Rate limit exceeded')) {
            errorMessage = i18n.t('auth.errors.rateLimited');
          } else if (rawError.includes('User account is disabled')) {
            errorMessage = i18n.t('auth.errors.disabled');
          } else if (rawError.includes('Invalid password')) {
            errorMessage = i18n.t('auth.errors.invalidPassword');
          } else if (rawError.includes('Authentication failed')) {
            errorMessage = i18n.t('auth.errors.invalidCredentials');
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

        // Reset connection status on logout
        useConnectionStore.getState().reset();

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
              error: i18n.t('auth.errors.accountDeactivated'),
            });
            return;
          }

          // Load granular module permissions for non-admin users
          let modulePermissions: ModulePermissions | undefined;
          if (user.role !== 'admin') {
            try {
              modulePermissions = await modulePermissionsApi.getMine(sessionToken) as ModulePermissions;
            } catch {
              set({
                user: null,
                sessionToken: null,
                isAuthenticated: false,
                isLoading: false,
                error: null,
              });
              return;
            }
          }

          set({
            user: { ...user, modulePermissions },
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          // Extend session expiry on app startup (fire and forget)
          invoke('refresh_session', { sessionToken }).catch((err) => {
            console.error('Failed to refresh session:', err);
          });

          // Check connection status on session restore (fire and forget)
          useConnectionStore.getState().checkConnection(sessionToken);
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
