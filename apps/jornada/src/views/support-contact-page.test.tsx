import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminWorkerPreviewProvider } from '../features/admin-worker-preview/admin-worker-preview-context';
import type { DrakeWorkerPreview } from '../features/schedule/schedule-api';
import { SupportContactPage } from './support-contact-page';

function renderPage(initialEntry = '/atendimento', selectedWorker: DrakeWorkerPreview | null = null) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <QueryClientProvider client={queryClient}>
        <AdminWorkerPreviewProvider initialSelectedWorker={selectedWorker}>
          <SupportContactPage />
        </AdminWorkerPreviewProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

const catalogResponse = {
  items: [
    {
      id: 'dept-medicine',
      code: 'MEDICINE',
      name: 'Medicina',
      description: null,
      topics: [
        {
          id: 'topic-aso',
          code: 'ASO',
          name: 'ASO',
          description: null,
          defaultPriority: 'NORMAL',
          openingPolicy: 'CONTINUOUS_CONVERSATION',
          businessKeyFieldCode: null,
          form: null,
        },
      ],
    },
    {
      id: 'dept-training',
      code: 'TRAINING',
      name: 'Treinamentos',
      description: null,
      topics: [
        {
          id: 'topic-certificate',
          code: 'CERTIFICATE',
          name: 'Certificado',
          description: null,
          defaultPriority: 'NORMAL',
          openingPolicy: 'CONTINUOUS_CONVERSATION',
          businessKeyFieldCode: null,
          form: null,
        },
      ],
    },
    {
      id: 'dept-finance',
      code: 'FINANCE',
      name: 'Financeiro',
      description: null,
      topics: [
        {
          id: 'topic-reimbursement',
          code: 'REIMBURSEMENT',
          name: 'Reembolso',
          description: null,
          defaultPriority: 'NORMAL',
          openingPolicy: 'INDIVIDUAL_REQUEST',
          businessKeyFieldCode: null,
          form: {
            id: 'form-reimbursement',
            version: 1,
            title: 'Dados do reembolso',
            description: null,
            fields: [
              {
                id: 'field-reimbursement-amount',
                code: 'valor_do_reembolso',
                label: 'Valor do reembolso',
                type: 'NUMBER',
                required: true,
                sensitive: false,
                helpText: null,
                options: null,
                optionSourceKey: null,
                visibleWhen: null,
                requiredWhen: null,
              },
            ],
          },
        },
      ],
    },
  ],
};

const emptyCasesResponse = {
  items: [],
};

const caseListResponse = {
  items: [
    {
      id: 'case-1',
      code: 'ATD-0001',
      title: 'Disponibilidade para treinamento',
      description: 'Preciso agendar.',
      status: 'WAITING_REQUESTER',
      priority: 'NORMAL',
      department: { id: 'dept-training', code: 'TRAINING', name: 'Treinamentos' },
      topic: { id: 'topic-certificate', code: 'CERTIFICATE', name: 'Certificado' },
      teamCode: 'TRAINING',
      teamName: 'Treinamentos',
      requester: { id: 'user-1', name: 'Colaborador', email: 'worker@example.test' },
      assignedUser: null,
      rating: null,
      originConversationId: null,
      dueAt: null,
      resolvedAt: null,
      closedAt: null,
      createdAt: '2026-09-10T10:00:00.000Z',
      updatedAt: '2026-09-10T10:30:00.000Z',
    },
  ],
};

const caseDetailResponse = {
  item: {
    ...caseListResponse.items[0],
    events: [],
    messages: [
      {
        id: 'msg-1',
        body: 'Temos vaga amanha pela manha.',
        senderName: 'Treinamentos',
        mine: false,
        createdAt: '2026-09-10T10:30:00.000Z',
      },
    ],
    form: null,
    fieldValues: [],
  },
};

const resolvedCaseListResponse = {
  items: [
    {
      ...caseListResponse.items[0],
      status: 'RESOLVED',
      resolvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
};

const resolvedCaseDetailResponse = {
  item: {
    ...caseDetailResponse.item,
    status: 'RESOLVED',
    resolvedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

describe('SupportContactPage', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('opens a Jornada support contact with department and topic preselected', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));

      if (url.pathname.endsWith('/support/catalog')) {
        return new Response(JSON.stringify(catalogResponse), { status: 200 });
      }

      if (url.pathname.endsWith('/support/cases') && init?.method === 'POST') {
        return new Response(JSON.stringify({
          item: {
            ...caseDetailResponse.item,
            id: 'case-created',
            title: 'Disponibilidade para treinamento',
          },
        }), { status: 200 });
      }

      if (url.pathname.endsWith('/support/cases')) {
        return new Response(JSON.stringify(emptyCasesResponse), { status: 200 });
      }

      return new Response(JSON.stringify({ message: 'not found' }), { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    renderPage('/atendimento?modo=new&setor=TRAINING&assunto=CERTIFICATE');

    expect(await screen.findByRole('heading', { name: 'Atendimento' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Setor')).toHaveValue('dept-training'));
    expect(screen.getByLabelText('Assunto')).toHaveValue('topic-certificate');

    await user.type(screen.getByLabelText('Mensagem'), 'Consigo realizar o treinamento na proxima semana.');
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }));

    await waitFor(() => {
      const createCall = fetchMock.mock.calls.find(([input, init]) =>
        String(input).includes('/support/cases') && init?.method === 'POST',
      );
      expect(createCall).toBeDefined();
      expect(JSON.parse(String(createCall?.[1]?.body))).toMatchObject({
        departmentId: 'dept-training',
        topicId: 'topic-certificate',
        description: 'Consigo realizar o treinamento na proxima semana.',
      });
    });
  });

  it('sends required reimbursement form fields from the Jornada contact screen', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));

      if (url.pathname.endsWith('/support/catalog')) {
        return new Response(JSON.stringify(catalogResponse), { status: 200 });
      }

      if (url.pathname.endsWith('/support/cases') && init?.method === 'POST') {
        return new Response(JSON.stringify({
          item: {
            ...caseDetailResponse.item,
            id: 'case-reimbursement',
            title: 'Reembolso',
          },
        }), { status: 200 });
      }

      if (url.pathname.endsWith('/support/cases')) {
        return new Response(JSON.stringify(emptyCasesResponse), { status: 200 });
      }

      return new Response(JSON.stringify({ message: 'not found' }), { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    renderPage('/atendimento?modo=new&setor=FINANCE&assunto=REIMBURSEMENT');

    await waitFor(() => expect(screen.getByLabelText('Setor')).toHaveValue('dept-finance'));
    expect(screen.getByLabelText('Assunto')).toHaveValue('topic-reimbursement');
    expect(await screen.findByLabelText(/Valor do reembolso/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Valor do reembolso/i), '120');
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }));

    await waitFor(() => {
      const createCall = fetchMock.mock.calls.find(([input, init]) =>
        String(input).includes('/support/cases') && init?.method === 'POST',
      );
      expect(createCall).toBeDefined();
      expect(JSON.parse(String(createCall?.[1]?.body))).toMatchObject({
        departmentId: 'dept-finance',
        topicId: 'topic-reimbursement',
        fieldValues: [
          {
            fieldId: 'field-reimbursement-amount',
            value: '120',
          },
        ],
      });
    });
  });

  it('shows an existing conversation and sends replies without opening the operational app', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));

      if (url.pathname.endsWith('/support/catalog')) {
        return new Response(JSON.stringify(catalogResponse), { status: 200 });
      }

      if (url.pathname.endsWith('/support/cases/case-1/messages') && init?.method === 'POST') {
        return new Response(JSON.stringify({
          message: {
            id: 'msg-2',
            body: 'Confirmo disponibilidade.',
            senderName: 'Colaborador',
            createdAt: '2026-09-10T11:00:00.000Z',
          },
        }), { status: 200 });
      }

      if (url.pathname.endsWith('/support/cases/case-1')) {
        return new Response(JSON.stringify(caseDetailResponse), { status: 200 });
      }

      if (url.pathname.endsWith('/support/cases')) {
        return new Response(JSON.stringify(caseListResponse), { status: 200 });
      }

      return new Response(JSON.stringify({ message: 'not found' }), { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    renderPage('/atendimento?caso=case-1');

    expect(await screen.findByText('Temos vaga amanha pela manha.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Responder atendimento'), 'Confirmo disponibilidade.');
    await user.click(screen.getByRole('button', { name: 'Enviar resposta' }));

    await waitFor(() => {
      const messageCall = fetchMock.mock.calls.find(([input, init]) =>
        String(input).includes('/support/cases/case-1/messages') && init?.method === 'POST',
      );
      expect(messageCall).toBeDefined();
      expect(JSON.parse(String(messageCall?.[1]?.body))).toEqual({
        body: 'Confirmo disponibilidade.',
      });
    });
  });

  it('reopens a recently resolved conversation from the Jornada contact screen', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));

      if (url.pathname.endsWith('/support/catalog')) {
        return new Response(JSON.stringify(catalogResponse), { status: 200 });
      }

      if (url.pathname.endsWith('/support/cases/case-1/reopen') && init?.method === 'POST') {
        return new Response(JSON.stringify({
          item: {
            ...resolvedCaseDetailResponse.item,
            status: 'OPEN',
            resolvedAt: null,
          },
        }), { status: 200 });
      }

      if (url.pathname.endsWith('/support/cases/case-1')) {
        return new Response(JSON.stringify(resolvedCaseDetailResponse), { status: 200 });
      }

      if (url.pathname.endsWith('/support/cases')) {
        return new Response(JSON.stringify(resolvedCaseListResponse), { status: 200 });
      }

      return new Response(JSON.stringify({ message: 'not found' }), { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    renderPage('/atendimento?caso=case-1');

    expect(await screen.findByText('Reabrir atendimento')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Motivo da reabertura'), 'REQUESTER_HAS_MORE_INFORMATION');
    await user.type(screen.getByLabelText('Mensagem de reabertura'), 'Ainda preciso combinar outro horario.');
    await user.click(screen.getByRole('button', { name: 'Reabrir' }));

    await waitFor(() => {
      const reopenCall = fetchMock.mock.calls.find(([input, init]) =>
        String(input).includes('/support/cases/case-1/reopen') && init?.method === 'POST',
      );
      expect(reopenCall).toBeDefined();
      expect(JSON.parse(String(reopenCall?.[1]?.body))).toEqual({
        reason: 'REQUESTER_HAS_MORE_INFORMATION',
        message: 'Ainda preciso combinar outro horario.',
      });
    });
  });

  it('uses the selected worker preview reference during admin validation', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));

      if (url.pathname.endsWith('/support/catalog')) {
        return new Response(JSON.stringify(catalogResponse), { status: 200 });
      }

      if (url.pathname.endsWith('/support/cases')) {
        return new Response(JSON.stringify(caseListResponse), { status: 200 });
      }

      return new Response(JSON.stringify({ message: 'not found' }), { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    renderPage('/atendimento', {
      previewReference: 'reference-without-external-worker-id-1234567890',
      fullName: 'Luan Silva Santos',
      employeeNumber: 'FRI-01-4717',
      operationalUnitName: 'Unidade',
    });

    expect(await screen.findByText(/Validação: Luan Silva Santos/)).toBeInTheDocument();

    await waitFor(() => {
      const listCall = fetchMock.mock.calls.find(([input]) => String(input).includes('/support/cases?'));
      expect(listCall?.[0]).toContain('previewReference=reference-without-external-worker-id-1234567890');
    });
  });
});
