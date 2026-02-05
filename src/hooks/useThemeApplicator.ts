import { useEffect } from 'react';
import { usePreferencesStore } from '../store/preferencesStore';
import { generatePalette, getContrastColor } from '../lib/colorUtils';
import { DEFAULT_PREFERENCES } from '../types/preferences';

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

  if (prefs.themeMode === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function resetThemeToDefaults() {
  applyThemeToDOM(DEFAULT_PREFERENCES);
}

export function useThemeApplicator() {
  const preferences = usePreferencesStore((s) => s.preferences);

  useEffect(() => {
    const prefs = preferences ?? DEFAULT_PREFERENCES;
    applyThemeToDOM({
      primaryColor: prefs.primaryColor,
      secondaryColor: prefs.secondaryColor,
      themeMode: prefs.themeMode,
    });
  }, [preferences]);
}
