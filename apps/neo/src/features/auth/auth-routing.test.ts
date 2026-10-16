import { describe, expect, it } from 'vitest';
import { defaultRouteForAuthenticatedUser, isSupportOperatorUser } from './auth-routing';

describe('auth-routing', () => {
  it('routes support operators to the support workspace when using legacy roles only', () => {
    const user = { roles: ['SUPPORT'] };

    expect(isSupportOperatorUser(user)).toBe(true);
    expect(defaultRouteForAuthenticatedUser(user)).toBe('/atendimentos?fila=nao-atribuidos');
  });

  it('routes regular employees to the inbox when there is no application catalog yet', () => {
    const user = { roles: ['EMPLOYEE'] };

    expect(isSupportOperatorUser(user)).toBe(false);
    expect(defaultRouteForAuthenticatedUser(user)).toBe('/inbox');
  });

  it('routes users with one application directly to that app entry path', () => {
    const user = { roles: ['EMPLOYEE'] };

    expect(
      defaultRouteForAuthenticatedUser(user, [
        {
          code: 'JORNADA',
          entryPath: '/inbox',
          isDefault: true,
        },
      ]),
    ).toBe('/inbox');
  });

  it('routes users with multiple applications to the application portal', () => {
    const user = { roles: ['ADMIN'] };

    expect(
      defaultRouteForAuthenticatedUser(user, [
        {
          code: 'JORNADA',
          entryPath: '/inbox',
          isDefault: true,
        },
        {
          code: 'TICKETS',
          entryPath: '/atendimentos',
          isDefault: false,
        },
      ]),
    ).toBe('/aplicativos');
  });
});
