import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { licenseApi, type HandshakeResult } from '../lib/api/license';

export interface LicenseInfo {
  id: string;
  customer: string;
  tenant: string;
  apiEndpoint: string;
  issuedAt: string;
  expiry: string | null;
  maxUsers: number | null;
  isValid: boolean;
  isLifetime: boolean;
}

interface LicenseState {
  license: LicenseInfo | null;
  isLicensed: boolean;
  isLoading: boolean;
  error: string | null;
  /** Estado del handshake post-activación */
  handshake: { status: 'idle' | 'loading' | 'done' | 'error'; recordsSynced: number };

  checkLicense: () => Promise<void>;
  activateLicense: (key: string) => Promise<void>;
  deactivateLicense: () => Promise<void>;
}

export const useLicenseStore = create<LicenseState>()((set) => ({
  license: null,
  isLicensed: false,
  isLoading: true,
  error: null,
  handshake: { status: 'idle', recordsSynced: 0 },

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
    set({ isLoading: true, error: null, handshake: { status: 'idle', recordsSynced: 0 } });
    try {
      const info = await invoke<LicenseInfo>('activate_license', { licenseKey: key });
      set({ license: info, isLicensed: info.isValid, isLoading: false, error: null });

      // Handshake best-effort: no bloquea el flujo si falla
      if (info.isValid) {
        set((s) => ({ handshake: { ...s.handshake, status: 'loading' } }));
        try {
          const result: HandshakeResult = await licenseApi.syncHandshake();
          set({
            handshake: {
              status: result.success ? 'done' : 'error',
              recordsSynced: result.recordsSynced,
            },
          });
        } catch {
          set({ handshake: { status: 'error', recordsSynced: 0 } });
        }
      }
    } catch (error) {
      set({ isLoading: false, error: error as string });
      throw error;
    }
  },

  deactivateLicense: async () => {
    try {
      await invoke('deactivate_license');
      set({ license: null, isLicensed: false, error: null, handshake: { status: 'idle', recordsSynced: 0 } });
    } catch (error) {
      set({ error: error as string });
    }
  },
}));

