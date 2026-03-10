import { invoke } from '@tauri-apps/api/core';
import type { LicenseInfo } from '../../store/licenseStore';

// ============================================================================
// License Commands
// ============================================================================

export interface HandshakeResult {
  success: boolean;
  recordsSynced: number;
  error: string | null;
}

export const licenseApi = {
  getStatus: () =>
    invoke<LicenseInfo | null>('get_license_status'),

  activate: (licenseKey: string) =>
    invoke<LicenseInfo>('activate_license', { licenseKey }),

  deactivate: () =>
    invoke<void>('deactivate_license'),

  /** Bootstrap handshake — best-effort, nunca lanza excepción */
  syncHandshake: () =>
    invoke<HandshakeResult>('sync_handshake'),
};
