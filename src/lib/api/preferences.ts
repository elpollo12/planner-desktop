import { invoke } from '@tauri-apps/api/core';
import type { UserPreferences, SavePreferencesInput } from '../../types/preferences';
import type {
  UpdatePreferences,
  SaveUpdatePreferencesInput,
  CheckUpdateResponse,
  UpdateCheckStatus,
} from '../../types/updates';

// ============================================================================
// User Preferences Commands
// ============================================================================

export const preferencesApi = {
  get: (sessionToken: string) =>
    invoke<UserPreferences | null>('get_user_preferences', { sessionToken }),

  save: (sessionToken: string, input: SavePreferencesInput) =>
    invoke<UserPreferences>('save_user_preferences', { sessionToken, input }),

  uploadLogo: (sessionToken: string, fileData: number[], fileName: string) =>
    invoke<string>('upload_logo', { sessionToken, fileData, fileName }),

  removeLogo: (sessionToken: string) =>
    invoke<void>('remove_logo', { sessionToken }),

  getLogoData: (sessionToken: string) =>
    invoke<string | null>('get_logo_data', { sessionToken }),

  getPublicLogoData: () =>
    invoke<string | null>('get_public_logo_data'),
};

// ============================================================================
// Update Preferences Commands
// ============================================================================

export const updatesApi = {
  getPreferences: (sessionToken: string) =>
    invoke<UpdatePreferences | null>('get_update_preferences', { sessionToken }),

  savePreferences: (sessionToken: string, input: SaveUpdatePreferencesInput) =>
    invoke<UpdatePreferences>('save_update_preferences', { sessionToken, input }),

  recordCheck: (sessionToken: string) =>
    invoke<void>('record_update_check', { sessionToken }),

  postpone: (sessionToken: string, version: string) =>
    invoke<UpdatePreferences>('postpone_update', { sessionToken, input: { version } }),

  clearPostpone: (sessionToken: string) =>
    invoke<void>('clear_postpone', { sessionToken }),

  getStatus: (sessionToken: string) =>
    invoke<UpdateCheckStatus>('get_update_status', { sessionToken }),

  checkFromApi: (apiUrl: string, channel?: string) =>
    invoke<CheckUpdateResponse>('check_for_update_from_api', { apiUrl, channel: channel ?? null }),

  recordDownload: (apiUrl: string, version: string, fromVersion?: string) =>
    invoke<void>('record_download_to_api', { apiUrl, version, fromVersion: fromVersion ?? null }),
};
