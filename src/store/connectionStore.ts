import { create } from 'zustand';
import { syncApi } from '../lib/api';

export type ConnectionState = 'unknown' | 'online' | 'offline' | 'syncing' | 'error' | 'checking';

interface ConnectionStoreState {
  /** Current connection state */
  status: ConnectionState;
  /** Last successful sync timestamp */
  lastOnlineAt: string | null;
  /** Error message if status is 'error' or 'offline' */
  errorMessage: string | null;
  /** Whether sync is configured (SYNC_SERVER_URL is set) */
  syncConfigured: boolean;
  /** Whether sync is enabled by admin */
  syncEnabled: boolean;
  /** Whether a connection check is in progress */
  isChecking: boolean;

  // Actions
  setOnline: () => void;
  setOffline: (error?: string) => void;
  setSyncing: () => void;
  setError: (message: string) => void;
  setSyncEnabled: (configured: boolean, enabled: boolean) => void;
  
  /** 
   * Check connection status by reading sync config.
   * This does NOT test the actual connection (that requires admin).
   * It just reads the current sync status to determine if we should show online/offline.
   */
  checkConnection: (sessionToken: string) => Promise<void>;
  
  /**
   * Reset to unknown state (used on logout)
   */
  reset: () => void;
}

export const useConnectionStore = create<ConnectionStoreState>((set, get) => ({
  // Start as 'unknown' - we don't know the status until we check
  status: 'unknown',
  lastOnlineAt: null,
  errorMessage: null,
  syncConfigured: false,
  syncEnabled: false,
  isChecking: false,

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

  checkConnection: async (sessionToken: string) => {
    const { isChecking } = get();
    
    // Avoid multiple concurrent checks
    if (isChecking) {
      return;
    }

    set({ isChecking: true, status: 'checking' });

    try {
      // Get sync status - this works for all users
      const syncStatus = await syncApi.getStatus(sessionToken);
      
      const configured = syncStatus.configured;
      const enabled = syncStatus.enabled;
      
      set({ 
        syncConfigured: configured,
        syncEnabled: enabled,
      });

      if (!configured) {
        // Sync server URL not configured
        set({ 
          status: 'offline', 
          errorMessage: null,
          isChecking: false,
        });
        return;
      }

      if (!enabled) {
        // Configured but not enabled by admin
        set({ 
          status: 'offline', 
          errorMessage: null,
          isChecking: false,
        });
        return;
      }

      // Sync is configured and enabled
      // Check if there was a recent successful sync
      if (syncStatus.lastSyncAt) {
        // We had a successful sync before, assume we're online
        set({
          status: 'online',
          lastOnlineAt: syncStatus.lastSyncAt,
          errorMessage: null,
          isChecking: false,
        });
      } else {
        // No sync yet, but sync is enabled - show as online (optimistic)
        // The actual connection will be tested when autoSync runs
        set({
          status: 'online',
          lastOnlineAt: null,
          errorMessage: null,
          isChecking: false,
        });
      }
    } catch (error: any) {
      const errorMsg = error?.message || error?.toString() || 'Error al verificar estado';
      
      set({
        status: 'error',
        errorMessage: errorMsg,
        isChecking: false,
      });
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
    }),
}));
