import { useEffect, useCallback, useRef } from 'react';
import { useUpdatesStore } from '../store';
import { useAuthStore } from '../store';
import { useModalStore } from '../store';
import { openUpdateModal } from '../components/modals/UpdateModal';

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
  const modalShownRef = useRef(false);
  
  const { openModal } = useModalStore();

  // Load preferences on mount if logged in
  useEffect(() => {
    if (sessionToken && !hasCheckedRef.current) {
      loadPreferences(sessionToken);
    }
  }, [sessionToken, loadPreferences]);

  // Initial update check with delay (only when authenticated)
  useEffect(() => {
    if (hasCheckedRef.current || !isAuthenticated) return;
    
    const timeout = setTimeout(() => {
      hasCheckedRef.current = true;
      checkForUpdate(sessionToken ?? undefined);
    }, 3000);
    
    return () => clearTimeout(timeout);
  }, [checkForUpdate, sessionToken, isAuthenticated]);

  // Periodic update checks based on preferences
  useEffect(() => {
    if (!preferences?.checkIntervalHours || !isAuthenticated) return;

    const intervalMs = preferences.checkIntervalHours * 60 * 60 * 1000;
    
    const interval = setInterval(() => {
      checkForUpdate(sessionToken ?? undefined);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [preferences?.checkIntervalHours, checkForUpdate, sessionToken, isAuthenticated]);

  // Show modal when update is available (for all users)
  useEffect(() => {
    if (
      updateState.status === 'available' &&
      !modalShownRef.current
    ) {
      const release = updateState.release;
      const isPostponed = preferences?.postponedVersion === release.version;
      
      // Don't show modal if this version was already postponed (user dismissed it)
      // But show if they've exhausted postpones
      const canStillPostpone = (preferences?.postponeCount ?? 0) < 3;
      
      // If auto-update is enabled, start download automatically
      if (preferences?.autoUpdate && !autoUpdateTriggeredRef.current) {
        console.log('[Updater] Auto-update enabled, starting download...');
        autoUpdateTriggeredRef.current = true;
        downloadAndInstall();
      } else if (!isPostponed || !canStillPostpone) {
        // Show modal if not postponed, or if postpones exhausted
        console.log('[Updater] Update available, showing modal...');
        modalShownRef.current = true;
        openUpdateModal(openModal);
      }
    }

    // Reset flags when no update is available
    if (updateState.status === 'idle') {
      autoUpdateTriggeredRef.current = false;
      modalShownRef.current = false;
    }
  }, [updateState, preferences?.autoUpdate, preferences?.postponedVersion, preferences?.postponeCount, downloadAndInstall, openModal]);

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
