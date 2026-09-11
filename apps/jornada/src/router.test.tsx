import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { persistAuthSession } from './features/auth/auth-session';
import { routeDefinitions } from './router';

describe('Neo unified module routing', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    persistAuthSession({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      tokenType: 'Bearer',
      user: {
        id: 'support-user',
        email: 'support@granservices.com.br',
        employeeId: null,
        fullName: 'Agente Focall',
        roles: ['SUPPORT'],
        status: 'ACTIVE',
        emailVerifiedAt: null,
      },
      applications: [
        {
          id: 'app-focall',
          code: 'HELP_HUB',
          name: 'Focall',
          description: 'Atendimentos e suporte ao colaborador.',
          entryKind: 'NATIVE',
          entryPath: '/atendimentos',
          isDefault: true,
          roles: ['AGENT'],
        },
      ],
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('opens Focall at its direct route under the unified Neo shell', async () => {
    const router = createMemoryRouter(routeDefinitions, {
      initialEntries: ['/atendimentos?fila=nao-atribuidos'],
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('heading', { name: 'Atendimentos' })).toBeInTheDocument();
    expect(screen.getByLabelText('Navegacao principal')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/atendimentos');
  });

  it('opens QuickForms at its direct route under the unified Neo shell', async () => {
    persistAuthSession({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      tokenType: 'Bearer',
      user: {
        id: 'forms-admin',
        email: 'forms@granservices.com.br',
        employeeId: null,
        fullName: 'Administradora QuickForms',
        roles: ['ADMIN', 'TI'],
        status: 'ACTIVE',
        emailVerifiedAt: null,
      },
      applications: [
        {
          id: 'app-quick-forms',
          code: 'QUICK_FORMS',
          name: 'QuickForms',
          description: 'Criador de formularios.',
          entryKind: 'NATIVE',
          entryPath: '/formularios',
          isDefault: true,
          roles: ['ADMIN'],
        },
      ],
    });

    const router = createMemoryRouter(routeDefinitions, {
      initialEntries: ['/formularios'],
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Biblioteca de formularios')).toBeInTheDocument();
    expect(screen.getByLabelText('Navegacao principal')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/formularios');
  });

  it('opens global administration outside the Jornada module', async () => {
    persistAuthSession({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      tokenType: 'Bearer',
      user: {
        id: 'neo-admin',
        email: 'admin@granservices.com.br',
        employeeId: null,
        fullName: 'Administradora Neo',
        roles: ['ADMIN'],
        status: 'ACTIVE',
        emailVerifiedAt: null,
      },
      applications: [],
    });

    const router = createMemoryRouter(routeDefinitions, {
      initialEntries: ['/administracao/aplicativos'],
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    const applicationHeadings = await screen.findAllByRole('heading', {
      name: 'Aplicativos',
    });
    expect(applicationHeadings.length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Usuarios e acessos' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: 'Inbox' })).not.toBeInTheDocument();
  });
});
