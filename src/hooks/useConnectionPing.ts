import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { useConnectionStore } from '../store/connectionStore';
import { syncApi } from '../lib/api';

/** Interval for connection ping in milliseconds (20 seconds) */
const PING_INTERVAL_MS = 20 * 1000;

/**
 * Hook that periodically pings the sync server to check connectivity.
 * This is independent of autoSync and runs more frequently to provide
 * responsive connection status updates.
 * 
 * Only runs when:
 * - User is authenticated
 * - Sync is configured and enabled
 * - Not currently syncing (to avoid interference)
 */
export function useConnectionPing() {
  const { sessionToken, isAuthenticated } = useAuthStore();
  const { status, syncEnabled, setOnline, setOffline } = useConnectionStore();
  const intervalRef = useRef<number | null>(null);

  const doPing = useCallback(async () => {
    // Skip if not authenticated or sync not enabled
    if (!sessionToken || !isAuthenticated || !syncEnabled) {
      return;
    }

    // Skip if currently syncing (let autoSync handle the status)
    if (status === 'syncing' || status === 'checking') {
      return;
    }

    try {
      const isOnline = await syncApi.ping(sessionToken);
      
      if (isOnline) {
        // Only update if we were offline (avoid unnecessary re-renders)
        if (status === 'offline' || status === 'error') {
          console.log('[Ping] Server is back online');
          setOnline();
        }
      } else {
        // Server not reachable
        if (status === 'online') {
          console.log('[Ping] Server is offline');
          setOffline('Servidor no disponible');
        }
      }
    } catch (error) {
      // Network error
      if (status === 'online') {
        console.log('[Ping] Connection lost:', error);
        setOffline('Error de conexión');
      }
    }
  }, [sessionToken, isAuthenticated, syncEnabled, status, setOnline, setOffline]);

  useEffect(() => {
    if (!isAuthenticated || !sessionToken || !syncEnabled) {
      // Clear interval if conditions not met
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Start periodic ping
    intervalRef.current = window.setInterval(doPing, PING_INTERVAL_MS);

    // Also do an immediate ping when conditions become met
    doPing();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated, sessionToken, syncEnabled, doPing]);
}
