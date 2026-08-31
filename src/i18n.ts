import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './locales/en';
import { uk } from './locales/uk';

export const SUPPORTED_LANGUAGES = ['en', 'uk'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

const STORAGE_KEY = 'huemix.language';
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

// WCAG 3.1.1 Language of Page: assistive tech relies on `<html lang>` to pick the right
// pronunciation/voice, and it's static in index.html -- keep it in sync with the actual
// UI language, both on initial load and on every subsequent switch.
function syncDocumentLanguage(lng: string): void {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng;
  }
}

syncDocumentLanguage(getInitialLanguage());
i18n.on('languageChanged', lng => {
  if (hasLocalStorage) {
    localStorage.setItem(STORAGE_KEY, lng);
  }
  syncDocumentLanguage(lng);
});

export default i18n;
