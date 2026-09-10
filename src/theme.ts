import { useSyncExternalStore } from "react";

export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

const STORAGE_KEY = "formulist.theme";
const hasLocalStorage = typeof localStorage !== "undefined";

function isTheme(value: string | null): value is Theme {
  return value !== null && (THEMES as readonly string[]).includes(value);
}

// No stored preference yet (first visit, or localStorage unavailable) -- defer to the OS/
// browser's own light/dark setting rather than hardcoding "light", same courtesy
// getInitialLanguage (i18n.ts) extends to navigator.language for the language pick.
function getInitialTheme(): Theme {
  if (hasLocalStorage) {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isTheme(stored)) {
      return stored;
    }
  }
  if (typeof window !== "undefined" && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

// Drives index.css's `:root[data-theme="dark"]` override block. Also sets `color-scheme`
// there (not here) so it's scoped per-theme alongside the custom properties it pairs with,
// rather than duplicated in both places.
function applyTheme(theme: Theme): void {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = theme;
  }
}

let currentTheme = getInitialTheme();
applyTheme(currentTheme);

// No external store (unlike i18next for language) -- a plain module-level value plus a
// listener set, read through useSyncExternalStore below, is all React needs for a value
// this small with exactly one writer (setTheme).
const listeners = new Set<() => void>();

function getTheme(): Theme {
  return currentTheme;
}

function setTheme(theme: Theme): void {
  if (theme === currentTheme) return;
  currentTheme = theme;
  applyTheme(theme);
  if (hasLocalStorage) {
    localStorage.setItem(STORAGE_KEY, theme);
  }
  listeners.forEach(listener => listener());
}

export function toggleTheme(): void {
  setTheme(currentTheme === "dark" ? "light" : "dark");
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Reactive read for components (e.g. ThemeSwitcher) that need to re-render when the theme
// changes -- plain getTheme()/setTheme()/toggleTheme() above are enough for everything else.
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme, getTheme);
}
