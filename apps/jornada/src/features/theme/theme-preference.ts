import { useSyncExternalStore } from 'react';

export type ThemePreference = 'dark' | 'light';

const THEME_STORAGE_KEY = 'jornada.theme.preference';
const THEME_CHANGE_EVENT = 'jornada-theme-preference-changed';
const DEFAULT_THEME: ThemePreference = 'dark';

function isBrowser() {
  return typeof window !== 'undefined';
}

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'dark' || value === 'light';
}

function readStoredThemePreference(): ThemePreference {
  if (!isBrowser()) {
    return DEFAULT_THEME;
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isThemePreference(stored) ? stored : DEFAULT_THEME;
}

function applyThemePreference(theme: ThemePreference) {
  if (!isBrowser()) {
    return;
  }

  document.documentElement.dataset.theme = theme;
}

function emitThemeChange() {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function initializeThemePreference() {
  applyThemePreference(readStoredThemePreference());
}

export function getThemePreferenceSnapshot() {
  return readStoredThemePreference();
}

export function setThemePreference(theme: ThemePreference) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyThemePreference(theme);
  emitThemeChange();
}

export function toggleThemePreference() {
  setThemePreference(readStoredThemePreference() === 'dark' ? 'light' : 'dark');
}

export function subscribeThemePreference(listener: () => void) {
  if (!isBrowser()) {
    return () => undefined;
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY || event.key === null) {
      applyThemePreference(readStoredThemePreference());
      listener();
    }
  };

  window.addEventListener(THEME_CHANGE_EVENT, listener);
  window.addEventListener('storage', onStorage);

  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function useThemePreference() {
  return useSyncExternalStore(
    subscribeThemePreference,
    getThemePreferenceSnapshot,
    () => DEFAULT_THEME,
  );
}
