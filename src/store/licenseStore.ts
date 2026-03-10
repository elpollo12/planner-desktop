import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

export interface LicenseInfo {
  id: string;
  customer: string;
  issuedAt: string;
  expiry: string | null;
  maxUsers: number;
  isValid: boolean;
  isLifetime: boolean;
}

interface LicenseState {
  license: LicenseInfo | null;
  isLicensed: boolean;
  isLoading: boolean;
  error: string | null;

  checkLicense: () => Promise<void>;
  activateLicense: (key: string) => Promise<void>;
  deactivateLicense: () => Promise<void>;
}

export const useLicenseStore = create<LicenseState>()((set) => ({
  license: null,
  isLicensed: false,
  isLoading: true,
  error: null,

  checkLicense: async () => {
    set({ isLoading: true, error: null });
    try {
      const info = await invoke<LicenseInfo | null>('get_license_status');
      if (info && info.isValid) {
        set({ license: info, isLicensed: true, isLoading: false });
      } else {
        const errorMsg = info && !info.isValid ? 'Licencia expirada' : null;
        set({ license: info, isLicensed: false, isLoading: false, error: errorMsg });
      }
    } catch (error) {
      set({ license: null, isLicensed: false, isLoading: false, error: error as string });
    }
  },

  activateLicense: async (key: string) => {
    set({ isLoading: true, error: null });
    try {
      const info = await invoke<LicenseInfo>('activate_license', { licenseKey: key });
      set({ license: info, isLicensed: info.isValid, isLoading: false, error: null });
    } catch (error) {
      set({ isLoading: false, error: error as string });
      throw error;
    }
  },

  deactivateLicense: async () => {
    try {
      await invoke('deactivate_license');
      set({ license: null, isLicensed: false, error: null });
    } catch (error) {
      set({ error: error as string });
    }
  },
}));
