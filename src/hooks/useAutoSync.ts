import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { useConnectionStore } from '../store/connectionStore';
import { syncApi } from '../lib/api';
import { syncEvents } from '../lib/syncEvents';

/**
 * Hook that automatically syncs with planner-sync server at the configured interval.
 * Runs in the background while the app is open.
 *
 * All authenticated users will automatically pull latest data from server.
 * This ensures reports from other clients appear automatically.
 * 
 * Also updates the connection status store for UI indicators.
 * 
 * Note: This hook does NOT set the initial connection status.
 * The initial check should be done after login via checkConnection().
 */
export function useAutoSync() {
  const { sessionToken, isAuthenticated } = useAuthStore();
  const { setOnline, setOffline, setSyncing, setError, setSyncEnabled, status } = useConnectionStore();
  const intervalRef = useRef<number | null>(null);
  const lastSyncRef = useRef<number>(0);

  const doSync = useCallback(async () => {
    if (!sessionToken) return;

    try {
      const syncStatus = await syncApi.getStatus(sessionToken);

      // Update sync enabled state
      setSyncEnabled(syncStatus.configured, syncStatus.enabled);

      if (!syncStatus.configured || !syncStatus.enabled || syncStatus.syncIntervalMinutes === 0) {
        // Don't change connection status if sync is just disabled
        return;
      }

      const intervalMs = syncStatus.syncIntervalMinutes * 60 * 1000;
      const now = Date.now();

      if (now - lastSyncRef.current < intervalMs) {
        return;
      }

      // Set syncing state
      setSyncing();
      console.log('[AutoSync] Starting incremental sync...');

      const result = await syncApi.incrementalSync(sessionToken);
      lastSyncRef.current = now;

      if (result.success) {
        console.log(`[AutoSync] Success: ${result.recordsPushed} pushed, ${result.recordsPulled} pulled`);
        setOnline();
      } else {
        console.warn('[AutoSync] Completed with errors:', result.errors);
        if (result.errors.length > 0) {
          setError(result.errors[0]);
        } else {
          // Partial success - still consider online
          setOnline();
        }
      }

      if (result.recordsPulled > 0) {
        syncEvents.emit();
      }
    } catch (error: any) {
      console.error('[AutoSync] Error:', error);
      // Set offline with error message
      setOffline(error?.message || 'Error de conexión');
    }
  }, [sessionToken, setOnline, setOffline, setSyncing, setError, setSyncEnabled]);

  useEffect(() => {
    if (!isAuthenticated || !sessionToken) {
      return;
    }

    // Initial sync after short delay
    const initialTimeout = setTimeout(() => {
      doSync();
    }, 5000);

    // Check every minute if we need to sync
    intervalRef.current = window.setInterval(() => {
      doSync();
    }, 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAuthenticated, sessionToken, doSync]);
}
