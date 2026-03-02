import { useEffect, useCallback, useRef } from 'react';
import { useUpdatesStore } from '../store';
import { useAuthStore } from '../store';

/**
 * Hook for checking and managing application updates.
 * Uses the updates store for state management and integrates with
 * both the planner-sync API and Tauri's built-in updater.
 * 
 * Features:
 * - Automatic update checks on mount and at configured intervals
 * - Auto-update: automatically downloads and prompts to install if enabled
 * - Postponement tracking (max 3 times per version)
 */
export function useUpdateChecker() {
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  
  const {
    preferences,
    updateState,
    currentVersion,
    loadPreferences,
    checkForUpdate,
    downloadAndInstall,
    installAndRelaunch,
    postponeUpdate,
    dismissUpdate,
  } = useUpdatesStore();

  const hasCheckedRef = useRef(false);
  const autoUpdateTriggeredRef = useRef(false);

  // Load preferences on mount if logged in
  useEffect(() => {
    if (sessionToken && !hasCheckedRef.current) {
      loadPreferences(sessionToken);
    }
  }, [sessionToken, loadPreferences]);

  // Initial update check with delay
  useEffect(() => {
    if (hasCheckedRef.current) return;
    
    const timeout = setTimeout(() => {
      hasCheckedRef.current = true;
      checkForUpdate(sessionToken ?? undefined);
    }, 3000);
    
    return () => clearTimeout(timeout);
  }, [checkForUpdate, sessionToken]);

  // Periodic update checks based on preferences
  useEffect(() => {
    if (!preferences?.checkIntervalHours || !isAuthenticated) return;

    const intervalMs = preferences.checkIntervalHours * 60 * 60 * 1000;
    
    const interval = setInterval(() => {
      checkForUpdate(sessionToken ?? undefined);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [preferences?.checkIntervalHours, checkForUpdate, sessionToken, isAuthenticated]);

  // Auto-update logic: if autoUpdate is enabled and update is available, start download
  useEffect(() => {
    if (
      preferences?.autoUpdate &&
      updateState.status === 'available' &&
      !autoUpdateTriggeredRef.current
    ) {
      // Check if this version was postponed too many times
      const release = updateState.release;
      const isPostponed = preferences.postponedVersion === release.version;
      const canStillPostpone = preferences.postponeCount < 3;

      // If not postponed or max postpones reached, auto-download
      if (!isPostponed || !canStillPostpone) {
        console.log('[Updater] Auto-update enabled, starting download...');
        autoUpdateTriggeredRef.current = true;
        downloadAndInstall();
      }
    }

    // Reset the flag when no update is available
    if (updateState.status === 'idle') {
      autoUpdateTriggeredRef.current = false;
    }
  }, [preferences?.autoUpdate, updateState, downloadAndInstall, preferences?.postponedVersion, preferences?.postponeCount]);

  const handlePostpone = useCallback(async () => {
    if (updateState.status !== 'available' || !sessionToken) return;
    
    try {
      await postponeUpdate(sessionToken, updateState.release.version);
    } catch (error) {
      console.error('[Updater] Postpone failed:', error);
    }
  }, [updateState, sessionToken, postponeUpdate]);

  const handleDismiss = useCallback(() => {
    dismissUpdate();
  }, [dismissUpdate]);

  const handleCheckForUpdate = useCallback(() => {
    checkForUpdate(sessionToken ?? undefined);
  }, [checkForUpdate, sessionToken]);

  // Computed values
  const isUpdateAvailable = updateState.status === 'available';
  const isDownloading = updateState.status === 'downloading';
  const isReady = updateState.status === 'ready';
  const hasError = updateState.status === 'error';
  
  const canPostpone = updateState.status === 'available' 
    ? updateState.canPostpone 
    : false;

  const downloadProgress = updateState.status === 'downloading' 
    ? updateState.progress 
    : 0;

  const errorMessage = updateState.status === 'error' 
    ? updateState.message 
    : null;

  const releaseInfo = updateState.status === 'available' 
    ? updateState.release 
    : null;

  return {
    // State
    state: updateState,
    preferences,
    currentVersion,
    
    // Computed
    isUpdateAvailable,
    isDownloading,
    isReady,
    hasError,
    canPostpone,
    downloadProgress,
    errorMessage,
    releaseInfo,

    // Actions
    checkForUpdate: handleCheckForUpdate,
    downloadAndInstall,
    installAndRelaunch,
    postponeUpdate: handlePostpone,
    dismissUpdate: handleDismiss,
  };
}
