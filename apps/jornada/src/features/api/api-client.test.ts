import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from './api-client';
import {
  clearAuthSession,
  getAuthSessionSnapshot,
  persistAuthSession,
} from '../auth/auth-session';

const session = {
  accessToken: 'invalid-access-token',
  refreshToken: 'refresh-token',
  tokenType: 'Bearer',
  user: {
    id: 'admin-user',
    email: 'admin@granservices.com.br',
    employeeId: null,
    fullName: 'Admin Jornada',
    roles: ['ADMIN'],
    status: 'ACTIVE',
    emailVerifiedAt: null,
  },
};

describe('apiFetch', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearAuthSession();
  });

  it('clears the local session when the API rejects an invalid access token', async () => {
    persistAuthSession(session);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          message: 'Token de acesso invalido.',
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    await expect(apiFetch('/support/catalog/admin')).rejects.toThrow(
      'Token de acesso invalido.',
    );

    expect(getAuthSessionSnapshot()).toBeNull();
  });

  it('returns a clear message when the API cannot be reached', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(apiFetch('/support/catalog/admin')).rejects.toThrow(
      'Nao foi possivel conectar com a API do Jornada.',
    );
  });
});
