import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { persistAuthSession } from '../features/auth/auth-session';
import { ApplicationsPage } from '../views/applications-page';
import { HubLayout } from './hub-layout';

describe('HubLayout', () => {
  beforeEach(() => {
    localStorage.clear();
    persistAuthSession({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      tokenType: 'Bearer',
      user: {
        id: 'user-1',
        email: 'admin@granservices.com.br',
        employeeId: null,
        fullName: 'Admin Neo',
        roles: ['ADMIN'],
        status: 'ACTIVE',
        emailVerifiedAt: null,
      },
      applications: [
        {
          id: 'jornada',
          code: 'JORNADA',
          name: 'Jornada',
          description: 'Programacao e vencimentos.',
          entryKind: 'NATIVE',
          entryPath: '/inbox',
          isDefault: true,
          roles: ['USER'],
        },
        {
          id: 'focall',
          code: 'HELP_HUB',
          name: 'Focall',
          description: 'Atendimentos e suporte.',
          entryKind: 'NATIVE',
          entryPath: '/atendimentos',
          isDefault: false,
          roles: ['ADMIN'],
        },
      ],
    });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('keeps application search centered in the Hub header and filters the grid', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/aplicativos']}>
          <Routes>
            <Route element={<HubLayout />}>
              <Route
                path="/aplicativos"
                element={<ApplicationsPage alwaysShowCatalog />}
              />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const search = screen.getByRole('searchbox', { name: 'Buscar aplicativos' });

    expect(search.closest('header')).toBeInTheDocument();

    await user.type(search, 'suporte');

    expect(screen.queryByText('Jornada')).not.toBeInTheDocument();
    expect(screen.getByText('Focall')).toBeInTheDocument();
  });
});
