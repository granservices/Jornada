import { describe, expect, it } from 'vitest';
import {
  applicationEntryHref,
  isExternalHref,
} from './application-entry';

describe('application-entry', () => {
  it('keeps Jornada entries inside the worker app', () => {
    expect(applicationEntryHref({ code: 'JORNADA', entryPath: '/inbox' })).toBe('/inbox');
  });

  it('keeps Focall entries inside the Neo frontend', () => {
    expect(applicationEntryHref({ code: 'HELP_HUB', entryPath: '/atendimentos' })).toBe(
      '/atendimentos',
    );
  });

  it('keeps QuickForms entries inside the Neo frontend', () => {
    expect(applicationEntryHref({ code: 'QUICK_FORMS', entryPath: '/formularios' })).toBe(
      '/formularios',
    );
  });

  it('identifies external app links', () => {
    expect(isExternalHref('http://localhost:3007/atendimentos')).toBe(true);
    expect(isExternalHref('/inbox')).toBe(false);
  });

  it('uses a direct external URL for catalog redirects', () => {
    const application = {
      code: 'CREW',
      entryKind: 'REDIRECT' as const,
      entryPath: 'https://crew.example.com',
    };

    expect(applicationEntryHref(application)).toBe('https://crew.example.com');
  });

  it('uses the registered route for native modules instead of catalog data', () => {
    expect(
      applicationEntryHref({ code: 'HELP_HUB', entryPath: '/rota-inconsistente' }),
    ).toBe('/atendimentos');
  });
});
