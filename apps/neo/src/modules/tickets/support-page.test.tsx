import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { persistAuthSession } from '../../features/auth/auth-session';
import { SupportPage } from './support-page';

const employeeSession = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  tokenType: 'Bearer',
  user: {
    id: 'employee-user',
    email: 'colaborador@granservices.com.br',
    employeeId: 'GRN-001',
    fullName: 'Colaborador Gran',
    roles: ['EMPLOYEE'],
    status: 'ACTIVE',
    emailVerifiedAt: null,
  },
};

const supportSession = {
  ...employeeSession,
  user: {
    ...employeeSession.user,
    id: 'support-user',
    email: 'suporte@granservices.com.br',
    fullName: 'Atendente Gran',
    roles: ['SUPPORT'],
  },
};

const catalog = {
  items: [
    {
      id: 'dept-training',
      code: 'TRAINING',
      name: 'Treinamentos',
      description: null,
      status: 'ACTIVE',
      sortOrder: 10,
      topics: [
        {
          id: 'topic-certificate',
          code: 'CERTIFICATE',
          name: 'Certificado',
          description: null,
          defaultPriority: 'NORMAL',
          openingPolicy: 'CONTINUOUS_CONVERSATION',
          businessKeyFieldCode: null,
          form: {
            id: 'form-certificate-v1',
            version: 1,
            title: 'Dados do certificado',
            description: null,
            fields: [
              {
                id: 'field-has-certificate',
                code: 'hasCertificate',
                label: 'Possui certificado',
                type: 'BOOLEAN',
                required: true,
                sensitive: false,
                helpText: null,
                options: null,
                visibleWhen: null,
                requiredWhen: null,
              },
              {
                id: 'field-certificate-number',
                code: 'certificateNumber',
                label: 'Numero do certificado',
                type: 'TEXT',
                required: false,
                sensitive: false,
                helpText: null,
                options: null,
                visibleWhen: {
                  all: [
                    {
                      fieldCode: 'hasCertificate',
                      operator: 'equals',
                      value: 'true',
                    },
                  ],
                },
                requiredWhen: {
                  all: [
                    {
                      fieldCode: 'hasCertificate',
                      operator: 'equals',
                      value: 'true',
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  ],
};

const emptyCases = {
  items: [],
  meta: {
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  },
};

const caseList = {
  items: [
    {
      id: 'case-1',
      code: 'ATD-000001',
      title: 'Certificado',
      description: 'Preciso regularizar meu certificado.',
      status: 'OPEN',
      priority: 'NORMAL',
      department: {
        id: 'dept-training',
        code: 'TRAINING',
        name: 'Treinamentos',
      },
      topic: {
        id: 'topic-certificate',
        code: 'CERTIFICATE',
        name: 'Certificado',
      },
      teamCode: 'TRAINING',
      teamName: 'Treinamentos',
      requester: {
        id: 'employee-user',
        name: 'Colaborador Gran',
        email: 'colaborador@granservices.com.br',
      },
      assignedUser: null,
      rating: null,
      originConversationId: 'conversation-1',
      dueAt: null,
      resolvedAt: null,
      closedAt: null,
      createdAt: '2026-08-23T10:00:00.000Z',
      updatedAt: '2026-08-23T10:05:00.000Z',
    },
    {
      id: 'case-2',
      code: 'ATD-000002',
      title: 'Folha de pagamento',
      description: 'Nao recebi o contracheque deste mes.',
      status: 'WAITING_REQUESTER',
      priority: 'HIGH',
      department: {
        id: 'dept-finance',
        code: 'FINANCE',
        name: 'Financeiro',
      },
      topic: {
        id: 'topic-payslip',
        code: 'PAYSLIP',
        name: 'Contracheque',
      },
      teamCode: 'FINANCE',
      teamName: 'Financeiro',
      requester: {
        id: 'employee-user-2',
        name: 'Maria Silva',
        email: 'maria@granservices.com.br',
      },
      assignedUser: {
        id: 'support-user',
        name: 'Atendente Gran',
        email: 'suporte@granservices.com.br',
      },
      rating: null,
      originConversationId: 'conversation-2',
      dueAt: null,
      resolvedAt: null,
      closedAt: null,
      createdAt: '2026-08-24T10:00:00.000Z',
      updatedAt: '2026-08-24T10:05:00.000Z',
    },
  ],
  meta: {
    page: 1,
    pageSize: 20,
    total: 2,
    totalPages: 1,
  },
};

const caseDetails = {
  'case-1': {
    item: {
      ...caseList.items[0],
      events: [
        {
          id: 'event-created',
          type: 'CREATED',
          fromValue: null,
          toValue: 'TRAINING',
          author: null,
          createdAt: '2026-08-23T10:00:00.000Z',
        },
        {
          id: 'event-commented',
          type: 'COMMENTED',
          fromValue: null,
          toValue: 'message-agent',
          author: {
            id: 'support-user',
            name: 'Atendente Gran',
            email: 'suporte@granservices.com.br',
          },
          createdAt: '2026-08-23T10:05:00.000Z',
        },
      ],
      messages: [
        {
          id: 'message-requester',
          body: 'Preciso regularizar meu certificado.',
          senderName: 'Colaborador Gran',
          mine: true,
          createdAt: '2026-08-23T10:01:00.000Z',
        },
        {
          id: 'message-agent',
          body: 'Vamos verificar seu cadastro.',
          senderName: 'Treinamentos',
          mine: false,
          createdAt: '2026-08-23T10:05:00.000Z',
        },
      ],
      form: null,
      fieldValues: [],
    },
  },
  'case-2': {
    item: {
      ...caseList.items[1],
      events: [
        {
          id: 'event-transferred',
          type: 'TRANSFERRED',
          fromValue: 'TRIAGE',
          toValue: 'FINANCE',
          author: null,
          createdAt: '2026-08-24T10:00:00.000Z',
        },
      ],
      messages: [
        {
          id: 'message-requester-2',
          body: 'Nao recebi o contracheque deste mes.',
          senderName: 'Maria Silva',
          mine: true,
          createdAt: '2026-08-24T10:01:00.000Z',
        },
        {
          id: 'message-agent-2',
          body: 'Pode me confirmar sua matricula?',
          senderName: 'Financeiro',
          mine: false,
          createdAt: '2026-08-24T10:05:00.000Z',
        },
      ],
      form: null,
      fieldValues: [],
    },
  },
};

const adminCatalog = {
  departments: [
    {
      id: 'dept-finance',
      code: 'FINANCE',
      name: 'Financeiro',
      description: null,
      status: 'ACTIVE',
      sortOrder: 10,
      topics: [],
    },
  ],
  teams: [],
  routingRules: [],
};

let publicCatalogResponse = catalog;
let catalogAdminResponse = adminCatalog;
let casesResponse: {
  items: unknown[];
  meta: typeof emptyCases.meta;
} = emptyCases;

describe('SupportPage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    publicCatalogResponse = catalog;
    catalogAdminResponse = adminCatalog;
    casesResponse = emptyCases;
    persistAuthSession(employeeSession);
    vi.spyOn(globalThis, 'fetch').mockImplementation(mockSupportFetch);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('renders, validates and submits conditional dynamic fields', async () => {
    const user = userEvent.setup();
    renderSupportPage();

    await user.click(await screen.findByText('Novo'));

    await waitFor(() =>
      expect(screen.getByText('Dados do certificado')).toBeInTheDocument(),
    );

    const initiallyHiddenInput = screen.queryByLabelText(/Numero do certificado/i);
    if (initiallyHiddenInput) {
      expect(initiallyHiddenInput).not.toBeVisible();
    }

    await user.click(screen.getByLabelText(/Possui certificado/i));

    const certificateInput = await screen.findByLabelText(/Numero do certificado/i);
    expect(certificateInput).toBeVisible();
    expect(within(certificateInput.closest('label') as HTMLElement).getByText('obrigatorio')).toBeInTheDocument();

    await user.click(screen.getByText('Abrir'));

    expect(globalThis.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/support/cases'),
      expect.objectContaining({ method: 'POST' }),
    );
    await user.type(certificateInput, 'CERT-123');
    await user.click(screen.getByText('Abrir'));

    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/support/cases'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"fieldId":"field-certificate-number"'),
        }),
      ),
    );
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/support/cases'),
      expect.objectContaining({
        body: expect.stringContaining('"value":"true"'),
      }),
    );
    expect(
      await screen.findByLabelText('Adicionar mensagem ao atendimento'),
    ).toBeInTheDocument();
  }, 10000);

  it('falls back to the admin catalog for support users when public catalog is empty', async () => {
    const user = userEvent.setup();
    localStorage.clear();
    persistAuthSession(supportSession);
    publicCatalogResponse = { items: [] };

    renderSupportPage();

    await user.click(await screen.findByText('Novo'));

    expect(await screen.findByRole('option', { name: 'Financeiro' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Geral do setor' })).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/Descreva em poucas linhas/i), 'Preciso falar com financeiro.');
    await user.click(screen.getByText('Abrir'));

    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/support/cases'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"departmentId":"dept-finance"'),
        }),
      ),
    );
  }, 10000);

  it('opens a new support request with department and topic from the route', async () => {
    renderSupportPage('/atendimentos?modo=new&setor=TRAINING&assunto=CERTIFICATE');

    expect((await screen.findAllByText('Novo atendimento')).length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(screen.getByLabelText('Setor')).toHaveValue('dept-training');
      expect(screen.getByLabelText('Assunto')).toHaveValue('topic-certificate');
    });
    expect(screen.getByText('Dados do certificado')).toBeInTheDocument();
  }, 10000);

  it('shows support detail as a conversation and sends messages', async () => {
    const user = userEvent.setup();
    casesResponse = caseList;

    renderSupportPage();

    await user.click(await screen.findByText('Certificado'));

    expect(await screen.findByText('Vamos verificar seu cadastro.')).toBeInTheDocument();
    expect(screen.queryByText('Mensagem registrada')).not.toBeInTheDocument();
    expect(screen.queryByText(/conteudo registrado/i)).not.toBeInTheDocument();
    expect(screen.getAllByLabelText('Mensagem enviada').length).toBeGreaterThan(0);
    expect(screen.queryByLabelText('Mensagem recebida')).not.toBeInTheDocument();
    const reply = screen.getByLabelText('Adicionar mensagem ao atendimento');
    await user.type(reply, 'Obrigado pelo retorno.');
    await user.click(screen.getByLabelText('Enviar mensagem'));

    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/support/cases/case-1/messages'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Obrigado pelo retorno.'),
        }),
      ),
    );
  }, 10000);

  it('keeps the selected atendimento open after reload through the URL', async () => {
    casesResponse = caseList;

    renderSupportPage('/atendimentos?modo=detail&caso=case-1');

    expect(await screen.findByRole('heading', { name: 'Certificado' })).toBeInTheDocument();
    expect(await screen.findByText('Vamos verificar seu cadastro.')).toBeInTheDocument();
  }, 10000);

  it('shows a dedicated management mobile view for support users', async () => {
    const user = userEvent.setup();
    casesResponse = caseList;
    localStorage.clear();
    persistAuthSession(supportSession);

    renderSupportPage('/atendimentos?modo=detail&caso=case-1&aba=gestao');

    await user.click(await screen.findByRole('button', { name: 'Alternar contexto do atendimento' }));

    expect((await screen.findAllByText('Acoes')).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('Transferir equipe').length).toBeGreaterThan(0);
  }, 10000);

  it('keeps the queue visible for support users while the workspace is open', async () => {
    casesResponse = caseList;
    localStorage.clear();
    persistAuthSession(supportSession);

    renderSupportPage('/atendimentos?modo=detail&caso=case-1');

    expect((await screen.findAllByText('Para assumir')).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Lista' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Novo' }).length).toBeGreaterThan(0);
  }, 10000);

  it('defaults support operators to the queue for cases waiting to be assigned', async () => {
    casesResponse = caseList;
    localStorage.clear();
    persistAuthSession(supportSession);

    renderSupportPage('/atendimentos');

    const backlogButtons = await screen.findAllByRole('button', {
      name: /Para assumir/i,
    });
    expect(backlogButtons.some((button) => button.getAttribute('aria-pressed') === 'true')).toBe(true);
  }, 10000);

  it('allows support users to move to the next case from the active queue', async () => {
    const user = userEvent.setup();
    casesResponse = caseList;
    localStorage.clear();
    persistAuthSession(supportSession);

    renderSupportPage('/atendimentos?modo=detail&caso=case-1');

    expect(await screen.findByRole('heading', { name: 'Certificado' })).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Proximo' })[0]);

    expect(await screen.findByRole('heading', { name: 'Folha de pagamento' })).toBeInTheDocument();
    expect(screen.getByText('Pode me confirmar sua matricula?')).toBeInTheDocument();
  }, 10000);
});

function renderSupportPage(initialEntry = '/atendimentos') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <QueryClientProvider client={queryClient}>
        <SupportPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

async function mockSupportFetch(input: RequestInfo | URL, init?: RequestInit) {
  const url = new URL(String(input));

  if (url.pathname.endsWith('/support/teams')) {
    return jsonResponse({ items: [] });
  }

  if (url.pathname.endsWith('/support/catalog/admin')) {
    return jsonResponse(catalogAdminResponse);
  }

  if (url.pathname.endsWith('/support/catalog')) {
    return jsonResponse(publicCatalogResponse);
  }

  if (url.pathname.endsWith('/support/cases') && init?.method === 'POST') {
    return jsonResponse({
      item: {
        id: 'case-1',
        code: 'ATD-000001',
        title: 'Certificado',
        description: null,
        status: 'NEW',
        priority: 'NORMAL',
        department: null,
        topic: null,
        teamCode: null,
        teamName: 'Treinamentos',
        requester: {
          id: 'employee-user',
          name: 'Colaborador Gran',
          email: 'colaborador@granservices.com.br',
        },
        assignedUser: null,
        rating: null,
        createdAt: '2026-08-23T10:00:00.000Z',
        updatedAt: '2026-08-23T10:00:00.000Z',
        events: [],
        messages: [],
        fieldValues: [],
      },
    });
  }

  if (url.pathname.endsWith('/support/cases/case-1/messages')) {
    return jsonResponse({
      message: {
        id: 'message-reply',
        body: 'Obrigado pelo retorno.',
        senderName: 'Colaborador Gran',
        createdAt: '2026-08-23T10:10:00.000Z',
      },
    });
  }

  const caseMatch = url.pathname.match(/\/support\/cases\/([^/]+)$/);
  if (caseMatch) {
    const caseDetail = caseDetails[caseMatch[1] as keyof typeof caseDetails];

    if (caseDetail) {
      return jsonResponse(caseDetail);
    }
  }

  if (url.pathname.endsWith('/support/cases')) {
    return jsonResponse(casesResponse);
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
