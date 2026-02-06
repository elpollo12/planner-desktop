export interface UserPreferences {
  id: string;
  userId: string;
  primaryColor: string;
  secondaryColor: string;
  themeMode: 'light' | 'dark';
  logoPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SavePreferencesInput {
  primaryColor?: string;
  secondaryColor?: string;
  themeMode?: 'light' | 'dark';
}

export type ThemeMode = 'light' | 'dark';

export const DEFAULT_PREFERENCES = {
  primaryColor: '#1e3a5f',
  secondaryColor: '#f97316',
  themeMode: 'light' as ThemeMode,
  logoPath: null as string | null,
};
