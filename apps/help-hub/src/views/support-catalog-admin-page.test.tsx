import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { persistAuthSession } from '@jornada/frontend-core/auth';
import {
  SupportDepartmentsAdminPage,
  SupportRoutingRulesAdminPage,
  SupportTeamsAdminPage,
  SupportTopicsAdminPage,
} from './support-catalog-admin-page';

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

const supportSession = {
  ...adminSession,
  user: {
    ...adminSession.user,
    id: 'support-user',
    email: 'suporte@granservices.com.br',
    fullName: 'Atendente Gran',
    roles: ['SUPPORT'],
  },
};

const catalog = {
  departments: [
    {
      id: 'dept-hr',
      code: 'HR',
      name: 'RH',
      description: null,
      status: 'ACTIVE',
      sortOrder: 10,
      topics: [
        {
          id: 'topic-vacation',
          code: 'VACATION',
          name: 'Ferias',
          description: null,
          status: 'ACTIVE',
          defaultPriority: 'NORMAL',
          sortOrder: 10,
          forms: [
            {
              id: 'form-vacation-v1',
              version: 1,
              title: 'Solicitacao de ferias',
              description: null,
              status: 'ACTIVE',
              fields: [
                {
                  id: 'field-start-date',
                  code: 'startDate',
                  label: 'Data inicial',
                  type: 'DATE',
                  required: true,
                  sensitive: false,
                  helpText: null,
                  options: null,
                  visibleWhen: null,
                  requiredWhen: null,
                  sortOrder: 1,
                },
                {
                  id: 'field-period',
                  code: 'period',
                  label: 'Periodo',
                  type: 'SELECT',
                  required: true,
                  sensitive: false,
                  helpText: null,
                  options: ['Primeiro periodo', 'Segundo periodo'],
                  visibleWhen: null,
                  requiredWhen: null,
                  sortOrder: 2,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'dept-payroll',
      code: 'PAYROLL',
      name: 'Departamento Pessoal',
      description: null,
      status: 'ACTIVE',
      sortOrder: 20,
      topics: [],
    },
  ],
  teams: [
    {
      id: 'team-hr',
      code: 'HR',
      name: 'Equipe RH',
      status: 'ACTIVE',
      department: {
        id: 'dept-hr',
        code: 'HR',
        name: 'RH',
      },
      members: [],
    },
  ],
  routingRules: [
    {
      id: 'rule-hr-vacation',
      status: 'ACTIVE',
      priority: 100,
      conditions: null,
      department: {
        id: 'dept-hr',
        code: 'HR',
        name: 'RH',
      },
      topic: {
        id: 'topic-vacation',
        code: 'VACATION',
        name: 'Ferias',
      },
      team: {
        id: 'team-hr',
        code: 'HR',
        name: 'Equipe RH',
      },
    },
  ],
};

const assignableUsers = {
  items: [
    {
      id: 'support-user',
      name: 'Atendente RH',
      email: 'atendente@granservices.com.br',
      roles: ['SUPPORT'],
    },
  ],
};

let catalogAdminFailureStatus: number | null = null;

describe('Support catalog admin pages', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    catalogAdminFailureStatus = null;
    persistAuthSession(adminSession);
    vi.spyOn(globalThis, 'fetch').mockImplementation(mockApiFetch);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('keeps department inputs stable while typing', async () => {
    const user = userEvent.setup();
    renderAdminPage(<SupportDepartmentsAdminPage />, '/atendimentos/configuracao/setores');

    const codeInput = await screen.findByLabelText('Codigo');
    await user.type(codeInput, 'FINANCEIRO');
    await user.type(screen.getByLabelText('Nome'), 'Financeiro');
    await user.type(screen.getByLabelText('Descricao'), 'Setor financeiro');

    expect((codeInput as HTMLInputElement).value).toBe('FINANCEIRO');
    expect((screen.getByLabelText('Nome') as HTMLInputElement).value).toBe(
      'Financeiro',
    );
  });

  it('loads a department into the form for editing and saves through PATCH', async () => {
    const user = userEvent.setup();
    renderAdminPage(<SupportDepartmentsAdminPage />, '/atendimentos/configuracao/setores');

    await waitFor(() =>
      expect(screen.getAllByText('Editar').length).toBeGreaterThan(0),
    );
    await user.click(screen.getAllByText('Editar')[0]);

    expect((screen.getByLabelText('Codigo') as HTMLInputElement).value).toBe('HR');
    expect((screen.getByLabelText('Nome') as HTMLInputElement).value).toBe('RH');

    await user.clear(screen.getByLabelText('Nome'));
    await user.type(screen.getByLabelText('Nome'), 'Recursos Humanos');
    await user.click(screen.getByText('Atualizar setor'));

    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/support/catalog/departments/dept-hr'),
        expect.objectContaining({ method: 'PATCH' }),
      ),
    );
  });

  it('keeps department maintenance read-only for support users', async () => {
    localStorage.clear();
    persistAuthSession(supportSession);

    renderAdminPage(<SupportDepartmentsAdminPage />, '/atendimentos/configuracao/setores');

    expect(
      await screen.findByText(/Setores sao mantidos pela administracao global/i),
    ).toBeInTheDocument();
    expect(await screen.findByText('RH')).toBeInTheDocument();
    expect(screen.queryByText('Salvar setor')).not.toBeInTheDocument();
    expect(screen.queryByText('Editar')).not.toBeInTheDocument();
    expect(screen.queryByText('Excluir')).not.toBeInTheDocument();
    expect(screen.getAllByText('Somente leitura').length).toBeGreaterThan(0);
  });

  it('shows the real loading error when the admin catalog request fails', async () => {
    catalogAdminFailureStatus = 500;

    renderAdminPage(<SupportDepartmentsAdminPage />, '/atendimentos/configuracao/setores');

    expect(
      await screen.findByText('Nao foi possivel carregar as configuracoes.'),
    ).toBeInTheDocument();
    expect(await screen.findByText('Falha ao carregar catalogo.')).toBeInTheDocument();
    expect(screen.getByText('Recarregar')).toBeInTheDocument();
  });

  it('shows an expired session state after an invalid token response', async () => {
    catalogAdminFailureStatus = 401;

    renderAdminPage(<SupportDepartmentsAdminPage />, '/atendimentos/configuracao/setores');

    expect(await screen.findByText('Sessao encerrada')).toBeInTheDocument();
    expect(
      screen.getByText('Entre novamente para carregar as configuracoes de atendimento.'),
    ).toBeInTheDocument();
  });

  it('distinguishes filtered empty state from missing departments', async () => {
    const user = userEvent.setup();
    renderAdminPage(<SupportDepartmentsAdminPage />, '/atendimentos/configuracao/setores');

    await screen.findByText('RH');
    await user.type(screen.getByLabelText('Buscar configuracoes'), 'inexistente');

    expect(await screen.findByText('Nenhum setor encontrado.')).toBeInTheDocument();
    expect(screen.getByText('Limpe ou ajuste a busca para ver os setores cadastrados.')).toBeInTheDocument();
  });

  it('keeps topic inputs stable while typing', async () => {
    const user = userEvent.setup();
    renderAdminPage(<SupportTopicsAdminPage />, '/atendimentos/configuracao/assuntos');

    await waitFor(() => expect(screen.getByText('Ferias')).toBeInTheDocument());

    const codeInput = screen.getByLabelText('Codigo');
    await user.type(codeInput, 'CONTRACHEQUE');
    await user.type(screen.getByLabelText('Nome'), 'Contracheque');
    await user.type(screen.getByLabelText('Descricao'), 'Solicitar holerite');

    expect((codeInput as HTMLInputElement).value).toBe('CONTRACHEQUE');
  });

  it('keeps team and member inputs stable while typing and selecting', async () => {
    const user = userEvent.setup();
    renderAdminPage(<SupportTeamsAdminPage />, '/atendimentos/configuracao/equipes');

    await waitFor(() =>
      expect(screen.getAllByText('Equipe RH').length).toBeGreaterThan(0),
    );

    const codeInput = screen.getByLabelText('Codigo');
    await user.type(codeInput, 'RH_FERIAS');
    await user.type(screen.getByLabelText('Nome'), 'Equipe de ferias');
    await user.selectOptions(screen.getByLabelText('Equipe'), 'team-hr');
    await user.selectOptions(screen.getByLabelText('Usuario'), 'support-user');

    expect((codeInput as HTMLInputElement).value).toBe('RH_FERIAS');
    expect((screen.getByLabelText('Usuario') as HTMLSelectElement).value).toBe(
      'support-user',
    );
  });

  it('keeps routing rule inputs stable while selecting options', async () => {
    const user = userEvent.setup();
    renderAdminPage(<SupportRoutingRulesAdminPage />, '/atendimentos/configuracao/regras');

    await waitFor(() =>
      expect(screen.getAllByText('Equipe RH').length).toBeGreaterThan(0),
    );

    await user.selectOptions(screen.getByLabelText('Setor'), 'dept-hr');
    await user.selectOptions(screen.getByLabelText('Assunto'), 'topic-vacation');
    await user.selectOptions(screen.getByLabelText('Equipe destino'), 'team-hr');
    await user.clear(screen.getByLabelText('Prioridade'));
    await user.type(screen.getByLabelText('Prioridade'), '42');
    await user.click(screen.getByText('Adicionar condicao'));
    await user.selectOptions(screen.getByLabelText('Campo da condicao 1'), 'startDate');
    await user.type(screen.getByLabelText('Valor da condicao 1'), '2026-09-01');

    expect((screen.getByLabelText('Prioridade') as HTMLInputElement).value).toBe(
      '42',
    );
    expect((screen.getByLabelText('Valor da condicao 1') as HTMLInputElement).value).toBe(
      '2026-09-01',
    );
  });

  it('keeps multiple routing conditions individually addressable', async () => {
    const user = userEvent.setup();
    renderAdminPage(<SupportRoutingRulesAdminPage />, '/atendimentos/configuracao/regras');

    await waitFor(() =>
      expect(screen.getAllByText('Equipe RH').length).toBeGreaterThan(0),
    );

    await user.selectOptions(screen.getByLabelText('Setor'), 'dept-hr');
    await user.selectOptions(screen.getByLabelText('Assunto'), 'topic-vacation');
    await user.selectOptions(screen.getByLabelText('Equipe destino'), 'team-hr');
    await user.click(screen.getByText('Adicionar condicao'));
    await user.click(screen.getByText('Adicionar condicao'));
    await user.selectOptions(screen.getByLabelText('Campo da condicao 1'), 'startDate');
    await user.type(screen.getByLabelText('Valor da condicao 1'), '2026-09-01');
    await user.selectOptions(screen.getByLabelText('Campo da condicao 2'), 'period');
    await user.selectOptions(screen.getByLabelText('Valor da condicao 2'), 'Segundo periodo');
    await user.click(screen.getByText('Salvar regra'));

    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/support/catalog/routing-rules'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"all"'),
        }),
      ),
    );
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/support/catalog/routing-rules'),
      expect.objectContaining({
        body: expect.stringContaining('"fieldCode":"period"'),
      }),
    );
  });

  it('sends routing rule conditions as parsed JSON', async () => {
    const user = userEvent.setup();
    renderAdminPage(<SupportRoutingRulesAdminPage />, '/atendimentos/configuracao/regras');

    await waitFor(() =>
      expect(screen.getAllByText('Equipe RH').length).toBeGreaterThan(0),
    );

    await user.selectOptions(screen.getByLabelText('Setor'), 'dept-hr');
    await user.selectOptions(screen.getByLabelText('Assunto'), 'topic-vacation');
    await user.selectOptions(screen.getByLabelText('Equipe destino'), 'team-hr');
    await user.click(screen.getByText('Adicionar condicao'));
    await user.selectOptions(screen.getByLabelText('Campo da condicao 1'), 'startDate');
    await user.type(screen.getByLabelText('Valor da condicao 1'), '2026-09-01');
    await user.click(screen.getByText('Salvar regra'));

    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/support/catalog/routing-rules'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"fieldCode":"startDate"'),
        }),
      ),
    );
  });

  it('toggles a routing rule status through PATCH', async () => {
    const user = userEvent.setup();
    renderAdminPage(<SupportRoutingRulesAdminPage />, '/atendimentos/configuracao/regras');

    await waitFor(() =>
      expect(screen.getAllByText('Equipe RH').length).toBeGreaterThan(0),
    );

    await user.click(screen.getByText('Inativar'));

    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/support/catalog/routing-rules/rule-hr-vacation'),
        expect.objectContaining({ method: 'PATCH' }),
      ),
    );
  });

});

function renderAdminPage(element: ReactElement, route: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>{element}</MemoryRouter>
    </QueryClientProvider>,
  );
}

async function mockApiFetch(input: RequestInfo | URL) {
  const url = new URL(String(input));

  if (url.pathname.endsWith('/support/catalog/admin')) {
    if (catalogAdminFailureStatus) {
      return jsonResponse(
        { message: catalogAdminFailureStatus === 401 ? 'Token de acesso invalido.' : 'Falha ao carregar catalogo.' },
        catalogAdminFailureStatus,
      );
    }

    return jsonResponse(catalog);
  }

  if (url.pathname.endsWith('/support/catalog/assignees')) {
    return jsonResponse(assignableUsers);
  }

  if (url.pathname.includes('/support/catalog/')) {
    return jsonResponse({ item: {} });
  }

  return jsonResponse({}, 404);
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
