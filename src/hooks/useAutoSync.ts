import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { syncApi } from '../lib/api';

/**
 * Hook that automatically syncs with Turso cloud at the configured interval.
 * Runs in the background while the app is open.
 */
export function useAutoSync() {
  const { sessionToken, isAuthenticated, user } = useAuthStore();
  const intervalRef = useRef<number | null>(null);
  const lastSyncRef = useRef<number>(0);

  const doSync = useCallback(async () => {
    if (!sessionToken) return;

    try {
      // Check if sync is configured and get interval
      const status = await syncApi.getStatus(sessionToken);

      if (!status.configured || !status.enabled || status.syncIntervalMinutes === 0) {
        // Auto-sync disabled or not configured
        return;
      }

      const intervalMs = status.syncIntervalMinutes * 60 * 1000;
      const now = Date.now();

      // Check if enough time has passed since last sync
      if (now - lastSyncRef.current < intervalMs) {
        return;
      }

      console.log('[AutoSync] Starting automatic sync...');
      const result = await syncApi.fullSync(sessionToken);
      lastSyncRef.current = now;

      if (result.success) {
        console.log(`[AutoSync] Success: ${result.recordsPushed} pushed, ${result.recordsPulled} pulled`);
      } else {
        console.warn('[AutoSync] Sync completed with errors:', result.errors);
      }
    } catch (error) {
      console.error('[AutoSync] Error:', error);
    }
  }, [sessionToken]);

  useEffect(() => {
    // Only run for authenticated admin users
    if (!isAuthenticated || !sessionToken || user?.role !== 'admin') {
      return;
    }

    // Do initial sync check after a short delay (let app settle)
    const initialTimeout = setTimeout(() => {
      doSync();
    }, 5000);

    // Check every minute if we need to sync
    // (the actual sync interval is checked inside doSync)
    intervalRef.current = window.setInterval(() => {
      doSync();
    }, 60 * 1000); // Check every minute

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAuthenticated, sessionToken, user?.role, doSync]);
}
