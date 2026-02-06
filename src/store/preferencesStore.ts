import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import type { UserPreferences, SavePreferencesInput } from '../types/preferences';

interface PreferencesState {
  preferences: UserPreferences | null;
  logoDataUrl: string | null;
  isLoading: boolean;

  loadPreferences: (sessionToken: string) => Promise<void>;
  savePreferences: (sessionToken: string, input: SavePreferencesInput) => Promise<void>;
  uploadLogo: (sessionToken: string, file: File) => Promise<string>;
  removeLogo: (sessionToken: string) => Promise<void>;
  clearPreferences: () => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      preferences: null,
      logoDataUrl: null,
      isLoading: false,

      loadPreferences: async (sessionToken: string) => {
        set({ isLoading: true });
        try {
          const prefs = await invoke<UserPreferences | null>('get_user_preferences', {
            sessionToken,
          });

          // Load logo as base64 data URL if a logo path exists
          let logoDataUrl: string | null = null;
          if (prefs?.logoPath) {
            try {
              logoDataUrl = await invoke<string | null>('get_logo_data', { sessionToken });
            } catch {
              console.error('Error loading logo data');
            }
          }

          set({ preferences: prefs, logoDataUrl, isLoading: false });
        } catch (error) {
          console.error('Error loading preferences:', error);
          set({ isLoading: false });
        }
      },

      savePreferences: async (sessionToken: string, input: SavePreferencesInput) => {
        set({ isLoading: true });
        try {
          const prefs = await invoke<UserPreferences>('save_user_preferences', {
            sessionToken,
            input,
          });
          set({ preferences: prefs, isLoading: false });
        } catch (error) {
          console.error('Error saving preferences:', error);
          set({ isLoading: false });
          throw error;
        }
      },

      uploadLogo: async (sessionToken: string, file: File) => {
        const buffer = await file.arrayBuffer();
        const fileData = Array.from(new Uint8Array(buffer));
        const logoPath = await invoke<string>('upload_logo', {
          sessionToken,
          fileData,
          fileName: file.name,
        });

        // Immediately load the logo as data URL
        let logoDataUrl: string | null = null;
        try {
          logoDataUrl = await invoke<string | null>('get_logo_data', { sessionToken });
        } catch {
          console.error('Error loading logo data after upload');
        }

        set((state) => ({
          preferences: state.preferences
            ? { ...state.preferences, logoPath }
            : null,
          logoDataUrl,
        }));
        return logoPath;
      },

      removeLogo: async (sessionToken: string) => {
        await invoke<void>('remove_logo', { sessionToken });
        set((state) => ({
          preferences: state.preferences
            ? { ...state.preferences, logoPath: null }
            : null,
          logoDataUrl: null,
        }));
      },

      clearPreferences: () => {
        set({ preferences: null, logoDataUrl: null });
      },
    }),
    {
      name: 'preferences-storage',
      partialize: (state) => ({
        preferences: state.preferences,
      }),
    }
  )
);
