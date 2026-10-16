import '@testing-library/jest-dom/vitest';

if (!globalThis.CSS) {
  Object.defineProperty(globalThis, 'CSS', {
    value: {},
    configurable: true,
  });
}

if (typeof globalThis.CSS.escape !== 'function') {
  globalThis.CSS.escape = (value: string) => value.replace(/[^a-zA-Z0-9_\u00A0-\uFFFF-]/g, '\\$&');
}
