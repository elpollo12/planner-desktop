import { useEffect, useCallback, useRef } from 'react';
import { useUpdatesStore } from '../store';
import { useAuthStore } from '../store';
import { useModalStore } from '../store';
import { openUpdateModal } from '../components/modals/UpdateModal';

/**
 * Flujo de actualización (NSIS/Windows):
 *   1. checkForUpdate()   → detecta update
 *   2. downloadUpdate()   → descarga el binario → status 'ready'
 *   3. prepareInstall()   → backup + sync push → status 'confirming' (modal)
 *   4. installAndRelaunch()→ instala + relanza (click explícito en modal)
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
    downloadUpdate,
    prepareInstall,
    installAndRelaunch,
    postponeUpdate,
    dismissUpdate,
  } = useUpdatesStore();

  const hasCheckedRef = useRef(false);
  const autoUpdateTriggeredRef = useRef(false);
  const modalShownRef = useRef(false);
  const { openModal } = useModalStore();

  useEffect(() => {
    if (sessionToken && !hasCheckedRef.current) loadPreferences(sessionToken);
  }, [sessionToken, loadPreferences]);

  useEffect(() => {
    if (hasCheckedRef.current || !isAuthenticated) return;
    const timeout = setTimeout(() => {
      hasCheckedRef.current = true;
      checkForUpdate(sessionToken ?? undefined);
    }, 3000);
    return () => clearTimeout(timeout);
  }, [checkForUpdate, sessionToken, isAuthenticated]);

  useEffect(() => {
    if (!preferences?.checkIntervalHours || !isAuthenticated) return;
    const intervalMs = preferences.checkIntervalHours * 60 * 60 * 1000;
    const interval = setInterval(() => checkForUpdate(sessionToken ?? undefined), intervalMs);
    return () => clearInterval(interval);
  }, [preferences?.checkIntervalHours, checkForUpdate, sessionToken, isAuthenticated]);

  useEffect(() => {
    if (updateState.status !== 'available') {
      if (updateState.status === 'idle') {
        autoUpdateTriggeredRef.current = false;
        modalShownRef.current = false;
      }
      return;
    }
    const release = updateState.release;
    const isPostponed = preferences?.postponedVersion === release.version;
    const canStillPostpone = (preferences?.postponeCount ?? 0) < 3;

    if (preferences?.autoUpdate && !autoUpdateTriggeredRef.current) {
      autoUpdateTriggeredRef.current = true;
      downloadUpdate();
      return;
    }
    if (!modalShownRef.current && (!isPostponed || !canStillPostpone)) {
      modalShownRef.current = true;
      openUpdateModal(openModal);
    }
  }, [updateState, preferences?.autoUpdate, preferences?.postponedVersion,
      preferences?.postponeCount, downloadUpdate, openModal]);

  const handlePostpone = useCallback(async () => {
    if (updateState.status !== 'available' || !sessionToken) return;
    try { await postponeUpdate(sessionToken, updateState.release.version); }
    catch (error) { console.error('[Updater] Postpone failed:', error); }
  }, [updateState, sessionToken, postponeUpdate]);

  const handlePrepareInstall = useCallback(() => {
    prepareInstall(sessionToken);
  }, [prepareInstall, sessionToken]);

  return {
    state: updateState,
    preferences,
    currentVersion,

    isUpdateAvailable: updateState.status === 'available',
    isDownloading: updateState.status === 'downloading',
    isReady: updateState.status === 'ready',
    hasError: updateState.status === 'error',
    canPostpone: updateState.status === 'available' ? updateState.canPostpone : false,
    downloadProgress: updateState.status === 'downloading' ? updateState.progress : 0,
    errorMessage: updateState.status === 'error' ? updateState.message : null,
    releaseInfo: updateState.status === 'available' ? updateState.release : null,

    checkForUpdate: useCallback(() => checkForUpdate(sessionToken ?? undefined), [checkForUpdate, sessionToken]),
    downloadAndInstall: downloadUpdate,   // alias — no romper UpdateModal
    downloadUpdate,
    prepareInstall: handlePrepareInstall,
    installAndRelaunch,
    postponeUpdate: handlePostpone,
    dismissUpdate: useCallback(() => dismissUpdate(), [dismissUpdate]),
  };
}
