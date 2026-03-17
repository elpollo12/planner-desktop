import { create } from 'zustand';
import { syncApi } from '../lib/api';

export type ConnectionState = 'unknown' | 'online' | 'offline' | 'syncing' | 'error' | 'checking';

interface ConnectionStoreState {
  status: ConnectionState;
  lastOnlineAt: string | null;
  errorMessage: string | null;
  syncConfigured: boolean;
  syncEnabled: boolean;
  isChecking: boolean;
  /** Timestamp del último pull exitoso — cambia cada vez que llegan datos nuevos */
  lastPullAt: string | null;

  setOnline: () => void;
  setOffline: (error?: string) => void;
  setSyncing: () => void;
  setError: (message: string) => void;
  setSyncEnabled: (configured: boolean, enabled: boolean) => void;
  /** Marcar que un pull terminó con éxito — dispara re-renders en hooks suscritos */
  markPullDone: () => void;
  checkConnection: (sessionToken: string) => Promise<void>;
  reset: () => void;
}

export const useConnectionStore = create<ConnectionStoreState>((set, get) => ({
  status: 'unknown',
  lastOnlineAt: null,
  errorMessage: null,
  syncConfigured: false,
  syncEnabled: false,
  isChecking: false,
  lastPullAt: null,

  setOnline: () =>
    set({
      status: 'online',
      lastOnlineAt: new Date().toISOString(),
      errorMessage: null,
      isChecking: false,
    }),

  setOffline: (error?: string) =>
    set({
      status: 'offline',
      errorMessage: error || null,
      isChecking: false,
    }),

  setSyncing: () =>
    set({
      status: 'syncing',
      errorMessage: null,
    }),

  setError: (message: string) =>
    set({
      status: 'error',
      errorMessage: message,
      isChecking: false,
    }),

  setSyncEnabled: (configured: boolean, enabled: boolean) =>
    set({
      syncConfigured: configured,
      syncEnabled: enabled,
    }),

  markPullDone: () =>
    set({ lastPullAt: new Date().toISOString() }),

  checkConnection: async (sessionToken: string) => {
    const { isChecking } = get();
    if (isChecking) return;

    set({ isChecking: true, status: 'checking' });

    try {
      const syncStatus = await syncApi.getStatus(sessionToken);
      const configured = syncStatus.configured;
      const enabled = syncStatus.enabled;

      set({ syncConfigured: configured, syncEnabled: enabled });

      if (!configured) {
        set({ status: 'offline', errorMessage: null, isChecking: false });
        return;
      }
      if (!enabled) {
        set({ status: 'offline', errorMessage: null, isChecking: false });
        return;
      }

      if (syncStatus.lastSyncAt) {
        set({ status: 'online', lastOnlineAt: syncStatus.lastSyncAt, errorMessage: null, isChecking: false });
      } else {
        set({ status: 'online', lastOnlineAt: null, errorMessage: null, isChecking: false });
      }
    } catch (error: any) {
      const errorMsg = error?.message || error?.toString() || 'Error al verificar estado';
      set({ status: 'error', errorMessage: errorMsg, isChecking: false });
    }
  },

  reset: () =>
    set({
      status: 'unknown',
      lastOnlineAt: null,
      errorMessage: null,
      syncConfigured: false,
      syncEnabled: false,
      isChecking: false,
      lastPullAt: null,
    }),
}));
