import { invoke } from '@tauri-apps/api/core';
import type { LicenseInfo } from '../../store/licenseStore';

// ============================================================================
// License Commands
// ============================================================================

export const licenseApi = {
  getStatus: () =>
    invoke<LicenseInfo | null>('get_license_status'),

  activate: (licenseKey: string) =>
    invoke<LicenseInfo>('activate_license', { licenseKey }),

  deactivate: () =>
    invoke<void>('deactivate_license'),
};
