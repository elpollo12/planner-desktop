import { useState, useEffect, useCallback } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export type UpdateState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'available'; version: string; body?: string }
  | { status: 'downloading'; progress: number }
  | { status: 'ready' }
  | { status: 'error'; message: string };

export function useUpdateChecker() {
  const [state, setState] = useState<UpdateState>({ status: 'idle' });
  const [dismissed, setDismissed] = useState(false);

  const checkForUpdate = useCallback(async () => {
    try {
      setState({ status: 'checking' });
      const update = await check();
      if (update) {
        setState({
          status: 'available',
          version: update.version,
          body: update.body ?? undefined,
        });
      } else {
        setState({ status: 'idle' });
      }
    } catch (e) {
      console.error('[Updater] Check failed:', e);
      setState({ status: 'idle' });
    }
  }, []);

  const downloadAndInstall = useCallback(async () => {
    try {
      const update = await check();
      if (!update) return;

      setState({ status: 'downloading', progress: 0 });

      let totalBytes = 0;
      let downloadedBytes = 0;

      await update.downloadAndInstall((event)=> {
        if (event.event === 'Started') {
          totalBytes = event.data.contentLength ?? 0;
        } else if (event.event === 'Progress') {
          downloadedBytes += event.data.chunkLength;
          const progress =
            totalBytes > 0
              ? Math.round((downloadedBytes / totalBytes) * 100)
              : 0;
          setState({ status: 'downloading', progress });
        } else if (event.event === 'Finished') {
          setState({ status: 'ready' });
        }
      });

      setState({ status: 'ready' });
    } catch (e: any) {
      console.error('[Updater] Download failed:', e);
      setState({
        status: 'error',
        message: e?.message || 'Error al descargar la actualización',
      });
    }
  }, []);

  const installAndRelaunch = useCallback(async () => {
    await relaunch();
  }, []);

  // Check for updates on mount with a delay
  useEffect(() => {
    const timeout = setTimeout(() => {
      checkForUpdate();
    }, 3000);
    return () => clearTimeout(timeout);
  }, [checkForUpdate]);

  return {
    state,
    dismissed,
    setDismissed,
    checkForUpdate,
    downloadAndInstall,
    installAndRelaunch,
  };
}
