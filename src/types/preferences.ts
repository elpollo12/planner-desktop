export interface UserPreferences {
  id: string;
  userId: string;
  themeMode: 'light' | 'dark';
  createdAt: string;
  updatedAt: string;
}

export interface SavePreferencesInput {
  themeMode?: 'light' | 'dark';
}

export type ThemeMode = 'light' | 'dark';

export const DEFAULT_PREFERENCES = {
  themeMode: 'light' as ThemeMode,
};
