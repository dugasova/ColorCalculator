import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './locales/en';
import { uk } from './locales/uk';

export const SUPPORTED_LANGUAGES = ['en', 'uk'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

const STORAGE_KEY = 'colorcalculator.language';
const hasLocalStorage = typeof localStorage !== 'undefined';

function isSupportedLanguage(value: string | null): value is Language {
  return value !== null && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

function getInitialLanguage(): Language {
  if (hasLocalStorage) {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isSupportedLanguage(stored)) {
      return stored;
    }
  }
  if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('uk')) {
    return 'uk';
  }
  return 'en';
}

void i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      uk: { translation: uk },
    },
    lng: getInitialLanguage(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

i18n.on('languageChanged', lng => {
  if (hasLocalStorage) {
    localStorage.setItem(STORAGE_KEY, lng);
  }
});

export default i18n;
