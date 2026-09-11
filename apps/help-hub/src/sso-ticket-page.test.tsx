import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAuthSessionSnapshot } from '@jornada/frontend-core/auth';
import { SsoTicketPage } from './router';

describe('SsoTicketPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('exchanges a one-time ticket for a local HelpHub session before navigation', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: 'help-hub-access-token',
          refreshToken: 'help-hub-refresh-token',
          tokenType: 'Bearer',
          user: {
            id: 'user-1',
            email: 'colaborador@granservices.com.br',
            employeeId: 'GRN-001',
            fullName: 'Colaborador Gran',
            roles: ['EMPLOYEE'],
            status: 'ACTIVE',
            emailVerifiedAt: null,
          },
          applications: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    render(
      <MemoryRouter initialEntries={['/sso?ticket=opaque-ticket&returnTo=%2Fatendimentos']}>
        <Routes>
          <Route path="/sso" element={<SsoTicketPage />} />
          <Route path="/atendimentos" element={<div>Fila HelpHub</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Fila HelpHub')).toBeInTheDocument();
    await waitFor(() =>
      expect(getAuthSessionSnapshot()?.accessToken).toBe('help-hub-access-token'),
    );
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:3004/api/auth/sso-tickets/consume',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ ticket: 'opaque-ticket' }),
      }),
    );
  });
});
