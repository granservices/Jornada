import { describe, expect, it } from 'vitest';
import { parseCentralLoginIntent } from './central-login-intent';

describe('central login intent', () => {
  it('accepts a HelpHub return path from the shared login', () => {
    expect(
      parseCentralLoginIntent('?app=HELP_HUB&returnTo=%2Fatendimentos%3Ffila%3Dnao-atribuidos'),
    ).toEqual({
      applicationCode: 'HELP_HUB',
      entryPath: '/atendimentos?fila=nao-atribuidos',
    });
  });

  it('rejects destinations outside the selected application', () => {
    expect(parseCentralLoginIntent('?app=HELP_HUB&returnTo=%2Fformularios')).toBeNull();
    expect(parseCentralLoginIntent('?app=QUICK_FORMS&returnTo=https%3A%2F%2Fevil.example')).toBeNull();
  });
});
