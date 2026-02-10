import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import type { UserPreferences, SavePreferencesInput } from '../types/preferences';

interface PreferencesState {
  preferences: UserPreferences | null;
  isLoading: boolean;

  loadPreferences: (sessionToken: string) => Promise<void>;
  savePreferences: (sessionToken: string, input: SavePreferencesInput) => Promise<void>;
  toggleTheme: (sessionToken: string) => Promise<void>;
  clearPreferences: () => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      preferences: null,
      isLoading: false,

      loadPreferences: async (sessionToken: string) => {
        set({ isLoading: true });
        try {
          const prefs = await invoke<UserPreferences | null>('get_user_preferences', {
            sessionToken,
          });
          set({ preferences: prefs, isLoading: false });
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

      toggleTheme: async (sessionToken: string) => {
        const currentPrefs = usePreferencesStore.getState().preferences;
        // If no preferences exist, assume light mode (default) and switch to dark
        const currentMode = currentPrefs?.themeMode ?? 'light';
        const newThemeMode = currentMode === 'dark' ? 'light' : 'dark';

        try {
          const prefs = await invoke<UserPreferences>('save_user_preferences', {
            sessionToken,
            input: {
              themeMode: newThemeMode,
            },
          });
          set({ preferences: prefs });
        } catch (error) {
          console.error('Error toggling theme:', error);
          throw error;
        }
      },

      clearPreferences: () => {
        set({ preferences: null });
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
