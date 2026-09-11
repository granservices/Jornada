import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { persistAuthSession } from '@jornada/frontend-core/auth';
import { OptionSourcesPage } from './option-sources-page';

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

describe('OptionSourcesPage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    persistAuthSession(adminSession);
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = new URL(String(input));

      if (url.pathname.endsWith('/forms/option-sources') && init?.method === 'POST') {
        return jsonResponse({
          item: {
            id: 'source-new',
            key: 'centro_de_custo',
            name: 'Centros de custo',
            adapterType: 'HTTP_JSON',
            status: 'ACTIVE',
            cacheTtlSeconds: 300,
            createdAt: '2026-08-31T10:00:00.000Z',
            updatedAt: '2026-08-31T10:00:00.000Z',
          },
        });
      }

      if (url.pathname.endsWith('/forms/option-sources/preview')) {
        return jsonResponse({
          items: [{ value: '1', label: 'Administrativo' }],
          nextCursor: null,
          hasMore: false,
        });
      }

      if (url.pathname.endsWith('/forms/option-sources/centro_de_custo')) {
        return jsonResponse({
          item: {
            id: 'source-new',
            key: 'centro_de_custo',
            name: 'Centros de custo',
            adapterType: 'HTTP_JSON',
            status: 'ACTIVE',
            cacheTtlSeconds: 300,
            createdAt: '2026-08-31T10:00:00.000Z',
            updatedAt: '2026-08-31T10:00:00.000Z',
            config: {
              endpoint: 'https://api.example.com/cost-centers',
              itemsPath: 'items',
              valuePath: 'id',
              labelPath: 'name',
              queryParam: 'q',
            },
          },
        });
      }

      if (url.pathname.endsWith('/forms/option-sources')) {
        return jsonResponse({
          items: [
            {
              id: 'source-1',
              key: 'cost_centers',
              name: 'Centros de custo',
              adapterType: 'HTTP_JSON',
              status: 'ACTIVE',
              cacheTtlSeconds: 300,
              createdAt: '2026-08-31T10:00:00.000Z',
              updatedAt: '2026-08-31T10:00:00.000Z',
            },
          ],
        });
      }

      return jsonResponse({}, 404);
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('lists sources and allows opening the dedicated page', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText('Centros de custo')).toBeInTheDocument());
    expect(screen.getByText('Fontes de opcoes')).toBeInTheDocument();
    expect(screen.getByText('HTTP')).toBeInTheDocument();
  });

  it('creates a new source and previews the normalized response', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('Centros de custo')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Nova fonte' }));
    await user.type(screen.getByLabelText('Nome'), 'Centros de custo');
    await user.type(screen.getByLabelText('Chave'), 'centro_de_custo');
    await user.type(screen.getByLabelText('Endpoint'), 'https://api.example.com/cost-centers');

    await user.click(screen.getByRole('button', { name: 'Testar' }));

    await waitFor(() => expect(screen.getByText('Administrativo')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Salvar fonte' }));

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/forms/option-sources'),
      expect.objectContaining({ method: 'POST' }),
    ));
  });
});

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/formularios/fontes']}>
        <OptionSourcesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
