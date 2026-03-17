import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import type {
  UpdatePreferences,
  SaveUpdatePreferencesInput,
  CheckUpdateResponse,
  UpdateCheckStatus,
} from '../types/updates';
import type { PreInstallStep } from '../components/modals/InstallConfirmModal';

/**
 * Updates Store — flujo completo para NSIS/Windows:
 *
 *  1. checkForUpdate()      → detecta update, cachea objeto Update de Tauri
 *  2. downloadUpdate()      → SOLO descarga el binario → status 'ready'
 *  3. prepareInstall()      → backup DB + sync push → status 'confirming'
 *  4. installAndRelaunch()  → install() + relaunch() — ÚNICO cierre de proceso
 *
 * El objeto Update de Tauri (no serializable) se guarda en _pendingUpdate,
 * una ref de módulo fuera de Zustand. Nunca se persiste.
 * updateState tampoco se persiste: siempre arranca en 'idle' al reiniciar.
 */

let _pendingUpdate: Update | null = null;

type ConfirmingState = {
  status: 'confirming';
  release: import('../types/updates').ApiRelease;
  steps: PreInstallStep[];
  preparing: boolean;
  readyToInstall: boolean;
};

type ExtendedUpdateState =
  | import('../types/updates').UpdateState
  | ConfirmingState;

interface UpdatesState {
  preferences: UpdatePreferences | null;
  updateState: ExtendedUpdateState;
  currentVersion: string;

  loadPreferences: (sessionToken: string) => Promise<void>;
  savePreferences: (sessionToken: string, input: SaveUpdatePreferencesInput) => Promise<void>;
  checkForUpdate: (sessionToken?: string) => Promise<void>;
  downloadUpdate: () => Promise<void>;
  prepareInstall: (sessionToken: string | null) => Promise<void>;
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

      loadPreferences: async (sessionToken: string) => {
        try {
          const prefs = await invoke<UpdatePreferences | null>('get_update_preferences', { sessionToken });
          const status = await invoke<UpdateCheckStatus>('get_update_status', { sessionToken });
          set({ preferences: prefs, currentVersion: status.currentVersion });
        } catch (error) {
          console.error('[Updates] Failed to load preferences:', error);
        }
      },

      savePreferences: async (sessionToken: string, input: SaveUpdatePreferencesInput) => {
        try {
          const prefs = await invoke<UpdatePreferences>('save_update_preferences', { sessionToken, input });
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
          try {
            const response = await invoke<CheckUpdateResponse>('check_for_update_from_api', { channel });
            if (response.updateAvailable && response.release) {
              let canPostpone = true;
              if (sessionToken) {
                const status = await invoke<UpdateCheckStatus>('get_update_status', { sessionToken });
                canPostpone = status.canPostpone;
                invoke('record_update_check', { sessionToken }).catch(() => {});
              }
              try {
                const tauriUpdate = await check();
                if (tauriUpdate) {
                  _pendingUpdate = tauriUpdate;
                }
              } catch (e) {
                console.warn('[Updates] Tauri pre-fetch failed (non-fatal):', e);
              }
              set({
                updateState: { status: 'available', release: response.release, canPostpone },
                currentVersion: response.currentVersion,
              });
              return;
            }
          } catch (apiError) {
            console.warn('[Updates] API check failed, falling back to Tauri:', apiError);
          }

          const update = await check();
          if (update) {
            _pendingUpdate = update;
            set({
              updateState: {
                status: 'available',
                release: {
                  version: update.version, channel: 'stable',
                  pubDate: update.date ?? new Date().toISOString(),
                  notes: update.body ?? '', breakingChanges: false,
                  asset: { url: '', signature: '' },
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

      downloadUpdate: async () => {
        const { updateState, currentVersion } = get();
        if (updateState.status !== 'available') return;
        const release = updateState.release;
        try {
          set({ updateState: { status: 'downloading', progress: 0 } });
          if (!_pendingUpdate) {
            _pendingUpdate = await check();
          }
          if (!_pendingUpdate) throw new Error('No se encontró actualización disponible');

          let downloadedBytes = 0;
          let totalBytes = 0;
          await _pendingUpdate.download((event) => {
            if (event.event === 'Started') {
              totalBytes = event.data.contentLength ?? 0;
            } else if (event.event === 'Progress') {
              downloadedBytes += event.data.chunkLength;
              const progress = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0;
              set({ updateState: { status: 'downloading', progress } });
            }
          });

          invoke('record_download_to_api', {
            version: release.version, fromVersion: currentVersion,
          }).catch(() => {});

          set({ updateState: { status: 'ready' } });
        } catch (error: any) {
          console.error('[Updates] Download failed:', error);
          _pendingUpdate = null;
          set({ updateState: { status: 'error', message: error?.message || 'Error al descargar' } });
        }
      },

      prepareInstall: async (sessionToken: string | null) => {
        const { updateState } = get();
        const release = (updateState as any).release ?? {
          version: '?', channel: 'stable', pubDate: '', notes: '', breakingChanges: false,
          asset: { url: '', signature: '' },
        };

        const steps: PreInstallStep[] = [
          { id: 'backup', label: 'Copia de seguridad de la base de datos', status: 'pending' },
          { id: 'sync',   label: 'Sincronizando datos pendientes con el servidor', status: 'pending' },
        ];

        set({
          updateState: {
            status: 'confirming' as any,
            release,
            steps,
            preparing: true,
            readyToInstall: false,
          },
        });

        const updateStep = (id: PreInstallStep['id'], patch: Partial<PreInstallStep>) => {
          set((state) => {
            const curr = state.updateState as ConfirmingState;
            return {
              updateState: {
                ...curr,
                steps: curr.steps.map((s) => s.id === id ? { ...s, ...patch } : s),
              },
            };
          });
        };

        // ── Paso 1: Backup ──────────────────────────────────────────────────
        updateStep('backup', { status: 'running' });
        try {
          if (!sessionToken) throw new Error('No hay sesión activa');
          const result = await invoke<{ success: boolean; backupPath: string; sizeBytes: number }>(
            'backup_database', { sessionToken }
          );
          const sizeKb = Math.round(result.sizeBytes / 1024);
          updateStep('backup', { status: 'ok', detail: `${sizeKb} KB guardados` });
        } catch (err: any) {
          console.error('[Updates] Backup failed:', err);
          updateStep('backup', { status: 'warning', detail: 'No se pudo crear backup — continuar con precaución' });
        }

        // ── Paso 2: Sync push ───────────────────────────────────────────────
        updateStep('sync', { status: 'running' });
        try {
          if (!sessionToken) throw new Error('No hay sesión activa');
          const syncStatus = await invoke<{ configured: boolean; enabled: boolean }>(
            'get_sync_status', { sessionToken }
          );
          if (!syncStatus.configured || !syncStatus.enabled) {
            updateStep('sync', { status: 'ok', detail: 'Sincronización no configurada — omitido' });
          } else {
            const result = await invoke<{ success: boolean; recordsPushed: number; errors: string[] }>(
              'sync_push', { sessionToken }
            );
            if (result.success) {
              updateStep('sync', { status: 'ok', detail: `${result.recordsPushed} registros enviados` });
            } else {
              const firstError = result.errors[0] ?? 'Error desconocido';
              updateStep('sync', { status: 'warning', detail: firstError });
            }
          }
        } catch (err: any) {
          console.error('[Updates] Pre-install sync failed:', err);
          updateStep('sync', { status: 'warning', detail: 'No se pudo sincronizar — continuar con precaución' });
        }

        set((state) => ({
          updateState: {
            ...(state.updateState as ConfirmingState),
            preparing: false,
            readyToInstall: true,
          },
        }));
      },

      installAndRelaunch: async () => {
        if (!_pendingUpdate) {
          console.warn('[Updates] _pendingUpdate lost — cannot install');
          set({ updateState: { status: 'error', message: 'Actualización no disponible, reinicia la app e intenta de nuevo' } });
          return;
        }
        try {
          const isMacOS = navigator.userAgent.toLowerCase().includes('mac');
          if (isMacOS) {
            // En macOS: downloadAndInstall() maneja todo el flujo
            await _pendingUpdate.downloadAndInstall();
          } else {
            // En Windows: el binario ya fue descargado con download(), solo instalar
            await _pendingUpdate.install();
          }
          _pendingUpdate = null;
          await relaunch();
        } catch (error: any) {
          console.error('[Updates] Install failed:', error);
          _pendingUpdate = null;
          set({ updateState: { status: 'error', message: error?.message || 'Error al instalar' } });
        }
      },

      postponeUpdate: async (sessionToken: string, version: string) => {
        try {
          await invoke('postpone_update', { sessionToken, input: { version } });
          _pendingUpdate = null;
          set({ updateState: { status: 'idle' } });
        } catch (error) {
          console.error('[Updates] Postpone failed:', error);
          throw error;
        }
      },

      dismissUpdate: () => {
        _pendingUpdate = null;
        set({ updateState: { status: 'idle' } });
      },

      clearState: () => {
        _pendingUpdate = null;
        set({ preferences: null, updateState: { status: 'idle' } });
      },
    }),
    {
      name: 'updates-storage',
      partialize: (state) => ({
        preferences: state.preferences,
      }),
    }
  )
);
