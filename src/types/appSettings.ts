export interface AppSettings {
  id: number;
  primaryColor: string;
  secondaryColor: string;
  logoPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaveAppSettingsInput {
  primaryColor?: string;
  secondaryColor?: string;
}

export const DEFAULT_APP_SETTINGS: Omit<AppSettings, 'id' | 'createdAt' | 'updatedAt'> = {
  primaryColor: '#1e3a5f',
  secondaryColor: '#f97316',
  logoPath: null,
};
