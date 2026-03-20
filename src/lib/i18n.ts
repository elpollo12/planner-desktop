import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files directly (bundled, no HTTP fetch needed in Tauri)
import esCommon from '../locales/es/common.json';
import enCommon from '../locales/en/common.json';

const resources = {
  es: { common: esCommon },
  en: { common: enCommon },
};

i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem('i18nextLng') || 'es',
  fallbackLng: 'es',
  defaultNS: 'common',
  ns: ['common'],
  interpolation: {
    escapeValue: false, // React already escapes
  },
});

// Persist language choice
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('i18nextLng', lng);
});

export default i18n;
