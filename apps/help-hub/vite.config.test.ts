import { describe, expect, it } from 'vitest';
import { atendimentoManualChunks } from './vite.config';

describe('atendimentoManualChunks', () => {
  it('keeps shared runtime libraries outside the atendimento entry chunk', () => {
    expect(atendimentoManualChunks('C:/repo/node_modules/react/index.js')).toBe('vendor-react');
    expect(atendimentoManualChunks('C:/repo/node_modules/react-dom/client.js')).toBe('vendor-react');
    expect(atendimentoManualChunks('C:/repo/node_modules/react-router/dist/index.js')).toBe(
      'vendor-router',
    );
    expect(atendimentoManualChunks('C:/repo/node_modules/@tanstack/react-query/build/index.js')).toBe(
      'vendor-query',
    );
    expect(atendimentoManualChunks('C:/repo/node_modules/motion/dist/react.mjs')).toBe('vendor-motion');
    expect(atendimentoManualChunks('C:/repo/node_modules/lucide-react/dist/esm/icons/save.js')).toBe(
      'vendor-icons',
    );
    expect(atendimentoManualChunks('C:/repo/node_modules/react-aria-components/dist/index.js')).toBe(
      'vendor-aria',
    );
  });

  it('does not force application code into vendor chunks', () => {
    expect(
      atendimentoManualChunks('C:/repo/apps/help-hub/src/views/support-page.tsx'),
    ).toBeUndefined();
  });
});
