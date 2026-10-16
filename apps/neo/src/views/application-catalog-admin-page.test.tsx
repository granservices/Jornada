import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { persistAuthSession } from '../features/auth/auth-session';
import { ApplicationCatalogAdminPage } from './application-catalog-admin-page';

const adminSession = {
  accessToken: 'access-token',
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

const catalog = {
  items: [
    {
      id: 'app-jornada',
      code: 'JORNADA',
      name: 'Jornada',
      description: 'Programacao e vencimentos.',
      entryKind: 'NATIVE',
      entryPath: '/inbox',
      imageUrl: '/neo-app-jornada.png',
      sortOrder: 10,
      status: 'ACTIVE',
      createdAt: '2026-09-02T10:00:00.000Z',
      updatedAt: '2026-09-02T10:00:00.000Z',
    },
  ],
};

describe('ApplicationCatalogAdminPage', () => {
  beforeEach(() => {
    localStorage.clear();
    persistAuthSession(adminSession);
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.endsWith('/auth/admin/applications') && !init?.method) {
        return new Response(JSON.stringify(catalog), { status: 200 });
      }

      if (url.endsWith('/auth/admin/applications') && init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            item: {
              ...catalog.items[0],
              id: 'app-crew',
              code: 'CREW',
              name: 'Crew',
              entryKind: 'REDIRECT',
              entryPath: 'https://crew.example.com',
            },
          }),
          { status: 201 },
        );
      }

      return new Response(JSON.stringify({ message: 'Rota inesperada' }), { status: 500 });
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('shows catalog entry type and filters applications', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Jornada')).toBeInTheDocument();
    expect(screen.getAllByText('Nativa').length).toBeGreaterThan(0);

    await user.type(screen.getByRole('searchbox', { name: 'Buscar aplicativos no catalogo' }), 'sem resultado');

    expect(screen.getByText('Nenhum aplicativo encontrado.')).toBeInTheDocument();
  });

  it('creates an external redirect from the catalog form', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Jornada');
    await user.click(screen.getByRole('button', { name: 'Nova aplicacao' }));
    await user.type(screen.getByLabelText('Codigo'), 'CREW');
    await user.type(screen.getByLabelText('Nome'), 'Crew');
    await user.selectOptions(screen.getByLabelText('Tipo de destino'), 'REDIRECT');
    await user.clear(screen.getByLabelText('URL de redirecionamento'));
    await user.type(screen.getByLabelText('URL de redirecionamento'), 'https://crew.example.com');
    await user.click(screen.getByRole('button', { name: 'Salvar aplicacao' }));

    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/admin/applications'),
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });
});

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ApplicationCatalogAdminPage />
    </QueryClientProvider>,
  );
}
