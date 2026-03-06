import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import type {
  UpdatePreferences,
  SaveUpdatePreferencesInput,
  CheckUpdateResponse,
  UpdateState,
  UpdateCheckStatus,
} from '../types/updates';

/**
 * Updates Store
 *
 * apiUrl is set automatically when the admin links a sync server (SyncSettings → handleConnect).
 * If empty, checkForUpdate skips the API call and falls back directly to the Tauri updater
 * (GitHub Releases), so the app always works even without a linked server.
 */

interface UpdatesState {
  // State
  preferences: UpdatePreferences | null;
  updateState: UpdateState;
  currentVersion: string;
  
  // Actions
  loadPreferences: (sessionToken: string) => Promise<void>;
  savePreferences: (sessionToken: string, input: SaveUpdatePreferencesInput) => Promise<void>;
  checkForUpdate: (sessionToken?: string) => Promise<void>;
  downloadAndInstall: () => Promise<void>;
  installAndRelaunch: () => Promise<void>;
  postponeUpdate: (sessionToken: string, version: string) => Promise<void>;
  dismissUpdate: () => void;
  clearState: () => void;
}

export const useUpdatesStore = create<UpdatesState>()(
  persist(
    (set, get) => ({
      preferences: null,
      updateState: { status: 'idle' },
      currentVersion: '',

      setApiUrl: (_url: string) => { /* no-op: URL is managed by sync_config.json in Rust */ },

      loadPreferences: async (sessionToken: string) => {
        try {
          const prefs = await invoke<UpdatePreferences | null>('get_update_preferences', {
            sessionToken,
          });
          
          const status = await invoke<UpdateCheckStatus>('get_update_status', {
            sessionToken,
          });
          
          set({ 
            preferences: prefs,
            currentVersion: status.currentVersion,
          });
        } catch (error) {
          console.error('[Updates] Failed to load preferences:', error);
        }
      },

      savePreferences: async (sessionToken: string, input: SaveUpdatePreferencesInput) => {
        try {
          const prefs = await invoke<UpdatePreferences>('save_update_preferences', {
            sessionToken,
            input,
          });
          set({ preferences: prefs });
        } catch (error) {
          console.error('[Updates] Failed to save preferences:', error);
          throw error;
        }
      },

      checkForUpdate: async (sessionToken?: string) => {
        const { preferences } = get();
        const channel = preferences?.channel ?? 'stable';

        try {
          set({ updateState: { status: 'checking' } });

          // Try planner-sync API first for richer metadata.
          // api_url is omitted — Rust resolves it from sync_config.json automatically.
          try {
            const response = await invoke<CheckUpdateResponse>('check_for_update_from_api', {
              channel,
            });

            if (response.updateAvailable && response.release) {
              // Check if we can postpone
              let canPostpone = true;
              if (sessionToken) {
                const status = await invoke<UpdateCheckStatus>('get_update_status', {
                  sessionToken,
                });
                canPostpone = status.canPostpone;

                // Record the check
                await invoke('record_update_check', { sessionToken }).catch(() => {});
              }

              set({
                updateState: {
                  status: 'available',
                  release: response.release,
                  canPostpone,
                },
                currentVersion: response.currentVersion,
              });
              return;
            }
          } catch (apiError) {
            console.warn('[Updates] API check failed, falling back to Tauri:', apiError);
          }

          // Fallback to Tauri updater (GitHub releases)
          const update = await check();
          if (update) {
            set({
              updateState: {
                status: 'available',
                release: {
                  version: update.version,
                  channel: 'stable',
                  pubDate: update.date ?? new Date().toISOString(),
                  notes: update.body ?? '',
                  breakingChanges: false,
                  asset: {
                    url: '',
                    signature: '',
                  },
                },
                canPostpone: true,
              },
            });
          } else {
            set({ updateState: { status: 'idle' } });
          }
        } catch (error) {
          console.error('[Updates] Check failed:', error);
          set({ updateState: { status: 'idle' } });
        }
      },

      downloadAndInstall: async () => {
        const { apiUrl, updateState, currentVersion } = get();

        if (updateState.status !== 'available') return;

        const release = updateState.release;

        try {
          set({ updateState: { status: 'downloading', progress: 0 } });

          // Use Tauri updater for actual download
          const update = await check();
          if (!update) {
            throw new Error('No update available');
          }

          let downloadedBytes = 0;
          let totalBytes = 0;

          await update.downloadAndInstall((event) => {
            if (event.event === 'Started') {
              totalBytes = event.data.contentLength ?? 0;
            } else if (event.event === 'Progress') {
              downloadedBytes += event.data.chunkLength;
              const progress = totalBytes > 0
                ? Math.round((downloadedBytes / totalBytes) * 100)
                : 0;
              set({ updateState: { status: 'downloading', progress } });
            } else if (event.event === 'Finished') {
              set({ updateState: { status: 'ready' } });
            }
          });

          // Record download to API for statistics (api_url resolved by Rust from sync_config)
          try {
            await invoke('record_download_to_api', {
              version: release.version,
              fromVersion: currentVersion,
            });
          } catch {
            // Ignore stats errors
          }

          set({ updateState: { status: 'ready' } });
        } catch (error: any) {
          console.error('[Updates] Download failed:', error);
          set({
            updateState: {
              status: 'error',
              message: error?.message || 'Error al descargar la actualización',
            },
          });
        }
      },

      installAndRelaunch: async () => {
        await relaunch();
      },

      postponeUpdate: async (sessionToken: string, version: string) => {
        try {
          await invoke('postpone_update', {
            sessionToken,
            input: { version },
          });
          set({ updateState: { status: 'idle' } });
        } catch (error) {
          console.error('[Updates] Postpone failed:', error);
          throw error;
        }
      },

      dismissUpdate: () => {
        set({ updateState: { status: 'idle' } });
      },

      clearState: () => {
        set({
          preferences: null,
          updateState: { status: 'idle' },
        });
      },
    }),
    {
      name: 'updates-storage',
      partialize: (state) => ({
        // Only persist preferences cache — URL is always read from sync_config.json by Rust
        preferences: state.preferences,
      }),
    }
  )
);
