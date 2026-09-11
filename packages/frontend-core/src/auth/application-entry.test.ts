import { describe, expect, it } from 'vitest';
import {
  applicationEntryHref,
  applicationSsoHref,
  centralLoginHref,
  isExternalHref,
} from './application-entry';

describe('frontend-core application entry', () => {
  it('keeps Jornada internal while routing independent applications to their origin', () => {
    expect(applicationEntryHref({ code: 'JORNADA', entryPath: '/inbox' })).toBe('/inbox');
    expect(applicationEntryHref({ code: 'HELP_HUB', entryPath: '/atendimentos' })).toBe('http://localhost:3007/atendimentos');
    expect(applicationEntryHref({ code: 'QUICK_FORMS', entryPath: '/formularios' })).toBe('http://localhost:3008/formularios');
  });

  it('builds an opaque SSO destination without source session data', () => {
    expect(
      applicationSsoHref(
        { code: 'QUICK_FORMS', entryPath: '/formularios/novo' },
        'opaque-ticket',
      ),
    ).toBe('http://localhost:3008/sso?ticket=opaque-ticket&returnTo=%2Fformularios%2Fnovo');
    expect(isExternalHref('/inbox')).toBe(false);
  });

  it('sends a direct application visit to Jornada central login with a local return path', () => {
    expect(
      centralLoginHref({
        code: 'HELP_HUB',
        entryPath: '/atendimentos?fila=nao-atribuidos',
      }),
    ).toBe(
      'http://localhost:3006/login?app=HELP_HUB&returnTo=%2Fatendimentos%3Ffila%3Dnao-atribuidos',
    );
  });
});
