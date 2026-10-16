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

  it('refreshes the session and retries the request when the access token expires', async () => {
    persistAuthSession(session);
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
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
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ...session,
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );

    await expect(apiFetch('/support/catalog/admin')).resolves.toEqual({ ok: true });

    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3004/api/auth/refresh',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ refreshToken: 'refresh-token' }),
      }),
    );
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      3,
      'http://localhost:3004/api/support/catalog/admin',
      expect.objectContaining({}),
    );
    const retryHeaders = (vi.mocked(globalThis.fetch).mock.calls[2]?.[1] as RequestInit)
      .headers as Headers;
    expect(retryHeaders.get('Authorization')).toBe('Bearer new-access-token');
    expect(getAuthSessionSnapshot()?.accessToken).toBe('new-access-token');
    expect(getAuthSessionSnapshot()?.refreshToken).toBe('new-refresh-token');
  });

  it('clears the local session when refresh fails', async () => {
    persistAuthSession(session);
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
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
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            message: 'Sessao expirada ou revogada.',
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
      'Sessao expirada. Entre novamente.',
    );

    expect(getAuthSessionSnapshot()).toBeNull();
  });

  it('clears the local session when the API rejects a request without refresh token', async () => {
    persistAuthSession({ ...session, refreshToken: '' });
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
