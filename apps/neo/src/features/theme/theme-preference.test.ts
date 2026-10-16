import { afterEach, describe, expect, it } from 'vitest';
import {
  initializeThemePreference,
  setThemePreference,
  toggleThemePreference,
} from './theme-preference';

const storageKey = 'jornada.theme.preference';

afterEach(() => {
  window.localStorage.removeItem(storageKey);
  delete document.documentElement.dataset.theme;
});

describe('theme preference', () => {
  it('applies the dark theme by default', () => {
    initializeThemePreference();

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });

  it('persists and toggles between light and dark themes', () => {
    setThemePreference('light');
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(window.localStorage.getItem(storageKey)).toBe('light');

    toggleThemePreference();
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(window.localStorage.getItem(storageKey)).toBe('dark');
  });
});
