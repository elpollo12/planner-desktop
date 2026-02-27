import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { syncApi } from '../lib/api';
import { syncEvents } from '../lib/syncEvents';

/**
 * Hook that automatically syncs with planner-sync server at the configured interval.
 * Runs in the background while the app is open.
 *
 * All authenticated users will automatically pull latest data from server.
 * This ensures reports from other clients appear automatically.
 */
export function useAutoSync() {
  const { sessionToken, isAuthenticated } = useAuthStore();
  const intervalRef = useRef<number | null>(null);
  const lastSyncRef = useRef<number>(0);

  const doSync = useCallback(async () => {
    if (!sessionToken) return;

    try {
      const status = await syncApi.getStatus(sessionToken);

      if (!status.configured || !status.enabled || status.syncIntervalMinutes === 0) {
        return;
      }

      const intervalMs = status.syncIntervalMinutes * 60 * 1000;
      const now = Date.now();

      if (now - lastSyncRef.current < intervalMs) {
        return;
      }

      console.log('[AutoSync] Starting incremental sync...');
      const result = await syncApi.incrementalSync(sessionToken);
      lastSyncRef.current = now;

      if (result.success) {
        console.log(`[AutoSync] Success: ${result.recordsPushed} pushed, ${result.recordsPulled} pulled`);
      } else {
        console.warn('[AutoSync] Completed with errors:', result.errors);
      }

      if (result.recordsPulled > 0) {
        syncEvents.emit();
      }
    } catch (error) {
      console.error('[AutoSync] Error:', error);
    }
  }, [sessionToken]);

  useEffect(() => {
    if (!isAuthenticated || !sessionToken) {
      return;
    }

    // Initial sync after short delay
    const initialTimeout = setTimeout(() => {
      doSync();
    }, 3000);

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
