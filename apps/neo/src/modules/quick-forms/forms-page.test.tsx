import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { persistAuthSession } from '../../features/auth/auth-session';
import { FormsPage } from './forms-page';

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

const forms = {
  items: [
    {
      key: 'juhi',
      latest: {
        id: 'form-juhi-new',
        key: 'juhi',
        version: 1,
        title: 'juhi',
        description: null,
        status: 'INACTIVE',
        ownerType: 'GLOBAL',
        ownerDepartment: null,
        schema: null,
        fields: [
          {
            id: 'field-juhi',
            code: 'campo',
            label: 'Campo',
            type: 'TEXT',
            required: false,
            sensitive: false,
            helpText: null,
            options: null,
            visibleWhen: null,
            requiredWhen: null,
            sortOrder: 1,
          },
        ],
        supportBindings: [],
        createdAt: '2026-08-26T10:00:00.000Z',
        updatedAt: '2026-08-26T10:00:00.000Z',
      },
      published: null,
      draft: null,
      versions: [],
    },
    {
      key: 'cmt67ga82000fo4c8vebt3y8x',
      latest: {
        id: 'form-juhi-legacy',
        key: 'cmt67ga82000fo4c8vebt3y8x',
        version: 1,
        title: 'juhi',
        description: null,
        status: 'INACTIVE',
        ownerType: 'GLOBAL',
        ownerDepartment: null,
        schema: null,
        fields: [
          {
            id: 'field-juhi-legacy',
            code: 'campo',
            label: 'Campo',
            type: 'TEXT',
            required: false,
            sensitive: false,
            helpText: null,
            options: null,
            visibleWhen: null,
            requiredWhen: null,
            sortOrder: 1,
          },
        ],
        supportBindings: [
          {
            id: 'binding-juhi',
            status: 'ACTIVE',
            required: true,
            topic: {
              id: 'topic-juhi',
              code: 'juhi',
              name: 'Juhi',
              department: {
                id: 'department-medicine',
                code: 'medicine',
                name: 'Medicina',
              },
            },
          },
        ],
        createdAt: '2026-08-26T10:00:00.000Z',
        updatedAt: '2026-08-26T10:00:00.000Z',
      },
      published: null,
      draft: null,
      versions: [],
    },
    {
      key: 'ferias',
      latest: {
        id: 'form-vacation-v1',
        key: 'ferias',
        version: 1,
        title: 'Solicitacao de ferias',
        description: null,
        status: 'ACTIVE',
        ownerType: 'GLOBAL',
        ownerDepartment: null,
        schema: {
          schema: {
            type: 'object',
            properties: {
              startDate: { type: 'string', title: 'Data inicial' },
            },
          },
        },
        fields: [],
        supportBindings: [],
        createdAt: '2026-08-26T10:00:00.000Z',
        updatedAt: '2026-08-26T10:00:00.000Z',
      },
      published: {
        id: 'form-vacation-v1',
        key: 'ferias',
        version: 1,
        title: 'Solicitacao de ferias',
        description: null,
        status: 'ACTIVE',
        ownerType: 'GLOBAL',
        ownerDepartment: null,
        schema: {
          schema: {
            type: 'object',
            properties: {
              startDate: { type: 'string', title: 'Data inicial' },
            },
          },
        },
        fields: [],
        supportBindings: [],
        createdAt: '2026-08-26T10:00:00.000Z',
        updatedAt: '2026-08-26T10:00:00.000Z',
      },
      draft: {
        id: 'form-vacation-draft',
        key: 'ferias',
        version: 2,
        title: 'Solicitacao de ferias em edicao',
        description: null,
        status: 'DRAFT',
        ownerType: 'GLOBAL',
        ownerDepartment: null,
        schema: null,
        fields: [],
        supportBindings: [],
        createdAt: '2026-08-26T11:00:00.000Z',
        updatedAt: '2026-08-27T11:00:00.000Z',
      },
      versions: [],
    },
  ],
};

describe('FormsPage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    persistAuthSession(adminSession);
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => jsonResponse(forms));
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('lists versioned forms and links to the official lab builder flow', async () => {
    renderPage({
      updatedFormKey: 'ferias',
      updatedFormTitle: 'Solicitacao de ferias',
      updatedFormStatus: 'DRAFT',
      updatedAt: '2026-08-27T11:00:00.000Z',
    });

    await waitFor(() => expect(screen.getByText('Solicitacao de ferias em edicao')).toBeInTheDocument());
    expect(screen.getByText('Rascunho salvo: Solicitacao de ferias')).toBeInTheDocument();
    expect(screen.getByText('recem atualizado')).toBeInTheDocument();
    expect(screen.getByText('Criado')).toBeInTheDocument();
    expect(screen.getByText('Atualizado')).toBeInTheDocument();
    expect(screen.getAllByText(/atualizado 26\/08\/26/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/27\/08\/26/).length).toBeGreaterThan(0);
    expect(screen.getByText('v1')).toBeInTheDocument();
    expect(screen.getByText('rascunho v2')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Novo' })).toHaveAttribute('href', '/formularios/novo');
    expect(screen.getByRole('link', { name: 'Fontes' })).toHaveAttribute('href', '/formularios/fontes');
    expect(
      screen
        .getAllByRole('link', { name: 'Editar' })
        .some((link) => link.getAttribute('href') === '/formularios/ferias/editar'),
    ).toBe(true);
    expect(screen.queryByText('Nenhum assunto encontrado.')).not.toBeInTheDocument();
    expect(screen.getAllByText('juhi')).toHaveLength(1);
    expect(screen.getByText('1 em atendimento')).toBeInTheDocument();
  });

  it('filters forms by title and shows an empty search result', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('Solicitacao de ferias em edicao')).toBeInTheDocument());

    await user.type(screen.getByLabelText('Pesquisar formularios'), 'ferias');
    expect(screen.getByText('Solicitacao de ferias em edicao')).toBeInTheDocument();
    expect(screen.queryByText('juhi')).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText('Pesquisar formularios'));
    await user.type(screen.getByLabelText('Pesquisar formularios'), 'nao existe');
    expect(screen.getByText('Nenhum formulario encontrado.')).toBeInTheDocument();
  });

  it('keeps listing available when the API omits optional version arrays', async () => {
    vi.mocked(globalThis.fetch).mockImplementationOnce(async () =>
      jsonResponse({
        items: [
          {
            key: 'aso',
            latest: {
              ...forms.items[0].latest,
              id: 'form-aso-latest',
              key: 'aso',
              title: 'Solicitacao de ASO',
              supportBindings: undefined,
            },
            published: null,
            draft: null,
          },
        ],
      }),
    );

    renderPage();

    await waitFor(() => expect(screen.getByText('Solicitacao de ASO')).toBeInTheDocument());
    expect(screen.queryByText(/Cannot read/i)).not.toBeInTheDocument();
  });
});

function renderPage(state?: unknown) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[{ pathname: '/formularios', state }]}>
        <FormsPage />
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
