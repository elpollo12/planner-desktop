import { useEffect, useCallback, useRef } from 'react';
import { useConnectionStore } from '../store/connectionStore';
import { useAuthStore } from '../store/authStore';

interface UseConnectionCheckerOptions {
  /** Check connection on mount */
  checkOnMount?: boolean;
  /** Interval in ms to periodically check (0 = disabled) */
  checkInterval?: number;
}

/**
 * Hook for checking and monitoring connection status.
 * 
 * @example
 * // Check on mount (default behavior)
 * useConnectionChecker();
 * 
 * @example
 * // Check on mount + every 30 seconds
 * useConnectionChecker({ checkInterval: 30000 });
 * 
 * @example
 * // Manual control only
 * const { checkConnection, isOnline } = useConnectionChecker({ checkOnMount: false });
 * // Then call checkConnection() when needed
 */
export function useConnectionChecker(options: UseConnectionCheckerOptions = {}) {
  const { checkOnMount = true, checkInterval = 0 } = options;
  
  const { sessionToken, isAuthenticated } = useAuthStore();
  const { status, syncEnabled, errorMessage, lastOnlineAt, checkConnection, isChecking } = useConnectionStore();
  
  const hasCheckedRef = useRef(false);

  // Wrapper that uses current session token
  const doCheck = useCallback(async () => {
    if (!sessionToken || !isAuthenticated) {
      return false;
    }
    return checkConnection(sessionToken);
  }, [sessionToken, isAuthenticated, checkConnection]);

  // Check on mount
  useEffect(() => {
    if (checkOnMount && !hasCheckedRef.current && sessionToken && isAuthenticated) {
      hasCheckedRef.current = true;
      doCheck();
    }
  }, [checkOnMount, sessionToken, isAuthenticated, doCheck]);

  // Reset flag when session changes
  useEffect(() => {
    if (!sessionToken) {
      hasCheckedRef.current = false;
    }
  }, [sessionToken]);

  // Periodic check
  useEffect(() => {
    if (checkInterval <= 0 || !sessionToken || !isAuthenticated) {
      return;
    }

    const interval = setInterval(() => {
      doCheck();
    }, checkInterval);

    return () => clearInterval(interval);
  }, [checkInterval, sessionToken, isAuthenticated, doCheck]);

  return {
    /** Current connection status */
    status,
    /** Whether currently online */
    isOnline: status === 'online',
    /** Whether currently offline */
    isOffline: status === 'offline',
    /** Whether currently syncing */
    isSyncing: status === 'syncing',
    /** Whether checking connection */
    isChecking: status === 'checking' || isChecking,
    /** Whether sync is configured and enabled */
    syncEnabled,
    /** Error message if any */
    errorMessage,
    /** Last time connection was confirmed online */
    lastOnlineAt,
    /** Manually trigger a connection check */
    checkConnection: doCheck,
  };
}
