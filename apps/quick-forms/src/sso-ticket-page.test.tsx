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

  it('exchanges a one-time ticket for a local QuickForms session before navigation', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: 'quick-forms-access-token',
          refreshToken: 'quick-forms-refresh-token',
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
      <MemoryRouter initialEntries={['/sso?ticket=opaque-ticket&returnTo=%2Fformularios']}>
        <Routes>
          <Route path="/sso" element={<SsoTicketPage />} />
          <Route path="/formularios" element={<div>Catalogo QuickForms</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Catalogo QuickForms')).toBeInTheDocument();
    await waitFor(() =>
      expect(getAuthSessionSnapshot()?.accessToken).toBe('quick-forms-access-token'),
    );
  });
});
