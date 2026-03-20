import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { AppSettings, SaveAppSettingsInput } from '../types';

interface AppSettingsState {
  settings: AppSettings | null;
  isLoading: boolean;
  loadSettings: () => Promise<void>;
  saveSettings: (sessionToken: string, input: SaveAppSettingsInput) => Promise<void>;
  /** Upload desde bytes ya procesados (Uint8Array) — usado por LogoUploader (soporta imgly) */
  uploadLogoFromBytes: (sessionToken: string, bytes: Uint8Array, fileName: string) => Promise<void>;
  /** @deprecated Usar uploadLogoFromBytes. Mantenido por compatibilidad interna. */
  uploadLogo: (sessionToken: string, fileData: number[], fileName: string) => Promise<void>;
  removeLogo: (sessionToken: string) => Promise<void>;
  clearSettings: () => void;
}

export const useAppSettingsStore = create<AppSettingsState>((set) => ({
  settings: null,
  isLoading: false,

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      const settings = await invoke<AppSettings>('get_app_settings', {});
      set({ settings, isLoading: false });
    } catch (error) {
      console.error('Error loading app settings:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  saveSettings: async (sessionToken: string, input: SaveAppSettingsInput) => {
    set({ isLoading: true });
    try {
      const settings = await invoke<AppSettings>('save_app_settings', {
        sessionToken,
        input,
      });
      set({ settings, isLoading: false });
    } catch (error) {
      console.error('Error saving app settings:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  uploadLogoFromBytes: async (sessionToken: string, bytes: Uint8Array, fileName: string) => {
    set({ isLoading: true });
    try {
      await invoke<string>('upload_company_logo', {
        sessionToken,
        fileData: Array.from(bytes),
        fileName,
      });
      const settings = await invoke<AppSettings>('get_app_settings', {});
      set({ settings, isLoading: false });
    } catch (error) {
      console.error('Error uploading logo:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  uploadLogo: async (sessionToken: string, fileData: number[], fileName: string) => {
    set({ isLoading: true });
    try {
      await invoke<string>('upload_company_logo', {
        sessionToken,
        fileData,
        fileName,
      });
      const settings = await invoke<AppSettings>('get_app_settings', {});
      set({ settings, isLoading: false });
    } catch (error) {
      console.error('Error uploading logo:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  removeLogo: async (sessionToken: string) => {
    set({ isLoading: true });
    try {
      await invoke('remove_company_logo', { sessionToken });
      const settings = await invoke<AppSettings>('get_app_settings', {});
      set({ settings, isLoading: false });
    } catch (error) {
      console.error('Error removing logo:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  clearSettings: () => {
    set({ settings: null, isLoading: false });
  },
}));
