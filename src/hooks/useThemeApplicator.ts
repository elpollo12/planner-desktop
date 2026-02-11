import { useEffect } from 'react';
import { usePreferencesStore } from '../store/preferencesStore';
import { useAppSettingsStore } from '../store/appSettingsStore';
import { generatePalette, getContrastColor } from '../lib/colorUtils';
import { DEFAULT_APP_SETTINGS } from '../types/appSettings';

function applyPalette(prefix: string, palette: Record<string, string>) {
  const root = document.documentElement;
  for (const [shade, color] of Object.entries(palette)) {
    root.style.setProperty(`--color-${prefix}-${shade}`, color);
  }
}

export function applyThemeToDOM(prefs: {
  primaryColor: string;
  secondaryColor: string;
  themeMode: string;
}) {
  applyPalette('primary', generatePalette(prefs.primaryColor));
  applyPalette('secondary', generatePalette(prefs.secondaryColor));

  // Set contrast color for text on primary backgrounds
  const root = document.documentElement;
  root.style.setProperty('--color-primary-contrast', getContrastColor(prefs.primaryColor));
  root.style.setProperty('--color-secondary-contrast', getContrastColor(prefs.secondaryColor));

  if (prefs.themeMode === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function resetThemeToDefaults() {
  applyThemeToDOM({
    primaryColor: DEFAULT_APP_SETTINGS.primaryColor,
    secondaryColor: DEFAULT_APP_SETTINGS.secondaryColor,
    themeMode: 'light',
  });
}

export function useThemeApplicator() {
  const preferences = usePreferencesStore((s) => s.preferences);
  const appSettings = useAppSettingsStore((s) => s.settings);

  useEffect(() => {
    // Colors come from app settings (corporate branding)
    // Theme mode comes from user preferences
    const primaryColor = appSettings?.primaryColor ?? DEFAULT_APP_SETTINGS.primaryColor;
    const secondaryColor = appSettings?.secondaryColor ?? DEFAULT_APP_SETTINGS.secondaryColor;
    const themeMode = preferences?.themeMode ?? 'light';

    applyThemeToDOM({
      primaryColor,
      secondaryColor,
      themeMode,
    });
  }, [preferences, appSettings]);
}
