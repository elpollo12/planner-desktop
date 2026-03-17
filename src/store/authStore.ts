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
          // El comando login en Rust ya hace sync_login + pull secuencialmente
          // antes de responder — cuando llegamos aquí los datos ya están en la DB local.
          const response = await invoke<LoginResponse>('login', {
            username,
            password,
          });

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

          // Check connection status (fire and forget)
          useConnectionStore.getState().checkConnection(response.sessionToken);
        } catch (error) {
          const rawError = error as string;
          let errorMessage = rawError;
          if (rawError.includes('Rate limit exceeded')) {
            errorMessage = i18n.t('auth.errors.rateLimited');
          } else if (rawError.includes('User account is disabled')) {
            errorMessage = i18n.t('auth.errors.disabled');
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

        useLogisticsStore.getState().clearSelectedRig();
        useConnectionStore.getState().reset();
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

          invoke('refresh_session', { sessionToken }).catch((err) => {
            console.error('Failed to refresh session:', err);
          });

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
        sessionToken: state.sessionToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
