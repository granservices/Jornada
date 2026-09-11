import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import { internalContractFixtures } from '../features/contracts/internal-contract-fixtures';
import { clearAuthSession, persistAuthSession } from '../features/auth/auth-session';
import { AdminWorkerPreviewProvider } from '../features/admin-worker-preview/admin-worker-preview-context';
import type { DrakeWorkerPreview } from '../features/schedule/schedule-api';
import { InboxPage, ProfilePage, ProgramacaoPage } from './dashboard-page';

function renderWithQueryClient(ui: ReactElement, selectedWorker: DrakeWorkerPreview | null = null) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminWorkerPreviewProvider initialSelectedWorker={selectedWorker}>
        {ui}
      </AdminWorkerPreviewProvider>
    </QueryClientProvider>,
  );
}

function renderProgramacao() {
  return renderWithQueryClient(<ProgramacaoPage />);
}

function isoDaysFromNow(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

describe('InboxPage', () => {
  afterEach(() => {
    clearAuthSession();
    vi.unstubAllGlobals();
    cleanup();
  });

  it('keeps filters outside the scrollable inbox list and filters visible rows', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(
      <MemoryRouter>
        <InboxPage />
      </MemoryRouter>,
    );

    const inboxList = screen.getByRole('list', { name: 'Lista do Inbox' });
    expect(inboxList).toHaveClass('overflow-y-auto');
    expect(inboxList).toHaveClass('rounded-[inherit]');
    expect(inboxList).toHaveClass('bg-[var(--admin-surface-1)]');
    expect(within(inboxList).getByText('Embarque confirmado para P-73')).toBeInTheDocument();
    expect(within(inboxList).queryByRole('button', { name: /Criticos/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Mensagens/i }));

    expect(within(inboxList).getByText('Operacoes enviou uma atualizacao')).toBeInTheDocument();
    expect(within(inboxList).queryByText('Embarque confirmado para P-73')).not.toBeInTheDocument();
  });

  it('renders inbox records from the internal contract fixture seam', () => {
    renderWithQueryClient(
      <MemoryRouter>
        <InboxPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(internalContractFixtures.inboxItems[0].summary)).toBeInTheDocument();
  });

  it('aggregates the next boarding or disembarking, trainings under 120 days and Focall replies', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));

      if (url.pathname.endsWith('/boarding-schedule/me')) {
        return new Response(JSON.stringify({
          items: [
            {
              scheduleItemId: 'schedule-medical',
              employeeId: 'employee-1',
              type: 'MEDICAL',
              title: 'ASO agendado',
              startsAt: isoDaysFromNow(1),
              endsAt: null,
              location: 'Medicina',
              status: 'CONFIRMED',
              sourceLabel: 'Programacao',
              action: { label: 'Ver', route: '/programacao?item=schedule-medical' },
            },
            {
              scheduleItemId: 'schedule-disembark',
              employeeId: 'employee-1',
              type: 'DISEMBARKING',
              title: 'Desembarque P-75',
              startsAt: isoDaysFromNow(2),
              endsAt: null,
              location: 'P-75 -> Macae',
              status: 'CONFIRMED',
              sourceLabel: 'Programacao',
              action: { label: 'Ver programação', route: '/programacao?item=schedule-disembark' },
            },
            {
              scheduleItemId: 'schedule-board',
              employeeId: 'employee-1',
              type: 'BOARDING',
              title: 'Embarque P-66',
              startsAt: isoDaysFromNow(5),
              endsAt: null,
              location: 'Macae -> P-66',
              status: 'CONFIRMED',
              sourceLabel: 'Programacao',
              action: { label: 'Ver programação', route: '/programacao?item=schedule-board' },
            },
          ],
          range: { from: isoDaysFromNow(-7), to: isoDaysFromNow(180) },
          source: { label: 'Drake', updatedAt: new Date().toISOString() },
        }), { status: 200 });
      }

      if (url.pathname.endsWith('/expiring-requirements/me')) {
        return new Response(JSON.stringify({
          items: [
            {
              requirementId: 'training-100',
              type: 'TRAINING',
              title: 'NR-35',
              expiresAt: isoDaysFromNow(100),
              status: 'VALID',
              severity: 'low',
              issuerLabel: 'Treinamento',
              action: { label: 'Ver vencimentos', route: '/vencimentos?requirementId=training-100' },
            },
            {
              requirementId: 'training-expired',
              type: 'TRAINING',
              title: 'CBSP vencido',
              expiresAt: isoDaysFromNow(-2),
              status: 'EXPIRED',
              severity: 'critical',
              issuerLabel: 'Treinamento',
              action: { label: 'Ver vencimentos', route: '/vencimentos?requirementId=training-expired' },
            },
            {
              requirementId: 'training-140',
              type: 'TRAINING',
              title: 'HUET futuro',
              expiresAt: isoDaysFromNow(140),
              status: 'VALID',
              severity: 'low',
              issuerLabel: 'Treinamento',
              action: { label: 'Ver vencimentos', route: '/vencimentos?requirementId=training-140' },
            },
            {
              requirementId: 'aso-5',
              type: 'ASO',
              title: 'ASO periodico',
              expiresAt: isoDaysFromNow(5),
              status: 'DUE_SOON',
              severity: 'high',
              issuerLabel: 'Medicina',
              action: { label: 'Ver vencimentos', route: '/vencimentos?requirementId=aso-5' },
            },
          ],
          source: { label: 'Drake', updatedAt: new Date().toISOString() },
        }), { status: 200 });
      }

      if (url.pathname.endsWith('/support/cases')) {
        return new Response(JSON.stringify({
          items: [
            {
              id: 'case-waiting',
              code: 'ATD-000101',
              title: 'Disponibilidade para treinamento',
              description: 'O setor de Treinamentos respondeu.',
              status: 'WAITING_REQUESTER',
              priority: 'NORMAL',
              department: { id: 'dept-training', code: 'TRAINING', name: 'Treinamentos' },
              topic: { id: 'topic-certificate', code: 'CERTIFICATE', name: 'Certificado' },
              teamCode: 'TRAINING',
              teamName: 'Treinamentos',
              requester: { id: 'employee-user', name: 'Colaborador', email: 'employee@example.test' },
              assignedUser: null,
              rating: null,
              originConversationId: null,
              dueAt: null,
              resolvedAt: null,
              closedAt: null,
              createdAt: isoDaysFromNow(-1),
              updatedAt: new Date().toISOString(),
            },
            {
              id: 'case-open',
              code: 'ATD-000102',
              title: 'Atendimento ainda aberto',
              description: null,
              status: 'OPEN',
              priority: 'NORMAL',
              department: { id: 'dept-medicine', code: 'MEDICINE', name: 'Medicina' },
              topic: { id: 'topic-aso', code: 'ASO', name: 'ASO' },
              teamCode: 'MEDICINE',
              teamName: 'Medicina',
              requester: { id: 'employee-user', name: 'Colaborador', email: 'employee@example.test' },
              assignedUser: null,
              rating: null,
              originConversationId: null,
              dueAt: null,
              resolvedAt: null,
              closedAt: null,
              createdAt: isoDaysFromNow(-1),
              updatedAt: new Date().toISOString(),
            },
            {
              id: 'case-resolved',
              code: 'ATD-000103',
              title: 'Atendimento resolvido para avaliar',
              description: null,
              status: 'RESOLVED',
              priority: 'NORMAL',
              department: { id: 'dept-training', code: 'TRAINING', name: 'Treinamentos' },
              topic: { id: 'topic-certificate', code: 'CERTIFICATE', name: 'Certificado' },
              teamCode: 'TRAINING',
              teamName: 'Treinamentos',
              requester: { id: 'employee-user', name: 'Colaborador', email: 'employee@example.test' },
              assignedUser: null,
              rating: null,
              originConversationId: null,
              dueAt: null,
              resolvedAt: new Date().toISOString(),
              closedAt: null,
              createdAt: isoDaysFromNow(-1),
              updatedAt: new Date().toISOString(),
            },
          ],
          meta: { page: 1, pageSize: 20, total: 3, totalPages: 1 },
        }), { status: 200 });
      }

      return new Response(JSON.stringify({ message: 'not found' }), { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);
    persistAuthSession({
      accessToken: 'access',
      refreshToken: 'refresh',
      tokenType: 'Bearer',
      user: {
        id: 'employee-user',
        email: 'employee@example.test',
        employeeId: 'REG-1',
        fullName: 'Colaborador',
        roles: ['EMPLOYEE'],
        status: 'ACTIVE',
        emailVerifiedAt: null,
      },
    });

    renderWithQueryClient(
      <MemoryRouter>
        <InboxPage />
      </MemoryRouter>,
    );

    const inboxList = screen.getByRole('list', { name: 'Lista do Inbox' });
    expect(await within(inboxList).findByText('Desembarque P-75')).toBeInTheDocument();
    expect(within(inboxList).queryByText('Embarque P-66')).not.toBeInTheDocument();
    expect(within(inboxList).queryByText('ASO agendado')).not.toBeInTheDocument();
    const trainingSoonItem = within(inboxList).getByText('NR-35').closest('article');
    expect(trainingSoonItem).not.toBeNull();
    expect(within(trainingSoonItem as HTMLElement).getByText('Próximo do vencimento')).toBeInTheDocument();
    const expiredTrainingItem = within(inboxList).getByText('CBSP vencido').closest('article');
    expect(expiredTrainingItem).not.toBeNull();
    expect(within(expiredTrainingItem as HTMLElement).getByText('Vencido')).toBeInTheDocument();
    expect(within(inboxList).queryByText('HUET futuro')).not.toBeInTheDocument();
    expect(within(inboxList).queryByText('ASO periodico')).not.toBeInTheDocument();
    expect(within(inboxList).getByText('Disponibilidade para treinamento')).toBeInTheDocument();
    expect(within(inboxList).queryByText('Atendimento ainda aberto')).not.toBeInTheDocument();
    expect(within(inboxList).getByText('Atendimento resolvido para avaliar')).toBeInTheDocument();
    expect(within(inboxList).getByRole('link', { name: /Responder/i })).toHaveAttribute(
      'href',
      '/atendimento?caso=case-waiting',
    );
    expect(within(inboxList).getByRole('link', { name: /Avaliar/i })).toHaveAttribute(
      'href',
      '/atendimento?caso=case-resolved',
    );
  });
});

describe('ProgramacaoPage', () => {
  afterEach(() => {
    clearAuthSession();
    vi.unstubAllGlobals();
    cleanup();
  });

  it('renders a compact timeline and filters employee events', async () => {
    const user = userEvent.setup();
    renderProgramacao();

    const timeline = screen.getByRole('list', { name: 'Linha do tempo da programação' });

    expect(timeline).toHaveClass('overflow-y-auto');
    expect(within(timeline).getByRole('heading', { name: 'Ago 2026' })).toBeInTheDocument();
    expect(within(timeline).getByText('mes atual')).toBeInTheDocument();
    expect(within(timeline).getByText('Embarque P-73')).toBeInTheDocument();
    expect(within(timeline).getAllByText('hoje').length).toBeGreaterThan(0);
    expect(within(timeline).getByText('4 eventos')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Desembarques' }));

    expect(within(timeline).getByText('Desembarque P-75')).toBeInTheDocument();
    expect(within(timeline).getByText('1 evento')).toBeInTheDocument();
    expect(within(timeline).queryByText('Embarque P-73')).not.toBeInTheDocument();
  });

  it('renders schedule records from the internal contract fixture seam', () => {
    renderProgramacao();

    expect(screen.getByText(internalContractFixtures.scheduleItems[1].title)).toBeInTheDocument();
  });

  it('uses the internal preview endpoints for an administrator pilot without exposing Drake in the view', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        items: [{
          scheduleItemId: 'drake-period-1', employeeId: 'worker-1', type: 'BOARDING', title: 'Embarque real',
          startsAt: '2026-09-10T12:00:00.000Z', endsAt: '2026-09-12T12:00:00.000Z', location: 'Unidade',
          status: 'CONFIRMED', sourceLabel: 'Drake', action: { label: 'Ver detalhes', route: '/programacao?item=period-1' },
        }],
        range: { from: '2026-09-01T00:00:00.000Z', to: '2026-10-01T00:00:00.000Z' },
        source: { label: 'Drake', updatedAt: '2026-09-01T00:00:00.000Z' },
      }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    persistAuthSession({
      accessToken: 'access', refreshToken: 'refresh', tokenType: 'Bearer',
      user: { id: 'admin-1', email: 'admin@example.test', employeeId: null, fullName: 'Admin', roles: ['ADMIN'], status: 'ACTIVE', emailVerifiedAt: null },
    });

    renderWithQueryClient(<ProgramacaoPage />, {
      previewReference: 'reference-without-external-worker-id-1234567890',
      fullName: 'Gero',
      employeeNumber: 'FRI-01-10014',
      operationalUnitName: 'Unidade',
    });

    expect(await screen.findByText('Embarque real')).toBeInTheDocument();
    expect(screen.getByText('Validação: Gero')).toBeInTheDocument();
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/boarding-schedule/preview?previewReference=reference-without-external-worker-id-1234567890');
    expect(fetchMock.mock.calls.flatMap((call) => call).join(' ')).not.toContain('drake.bz');
  });
});

describe('ProfilePage', () => {
  afterEach(() => {
    clearAuthSession();
    vi.unstubAllGlobals();
    cleanup();
  });

  it('renders profile identity from the internal contract fixture seam behind tabs', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<ProfilePage />);

    expect(screen.getAllByText(internalContractFixtures.employeeProfile.displayName).length).toBeGreaterThan(0);
    expect(screen.getByText(internalContractFixtures.employeeProfile.registration)).toBeInTheDocument();
    expect(screen.getByText(internalContractFixtures.employeeProfile.documentMasked)).toBeInTheDocument();
    expect(screen.queryByText('Documentos e requisitos')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Documentos/i }));

    expect(screen.getByText('Documentos e requisitos')).toBeInTheDocument();
  });

  it('loads and saves self-service profile preferences', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));

      if (url.pathname.endsWith('/auth/me/profile') && init?.method === 'PATCH') {
        return new Response(JSON.stringify({
          item: {
            official: {
              userId: 'user-1',
              email: 'luan@example.test',
              fullName: 'Luan Silva Santos',
              documentMasked: '***.456.789-**',
              birthDate: null,
              employeeNumber: 'FRI-01-4717',
              departmentName: 'Operacoes',
              accountStatus: 'ACTIVE',
              roles: ['EMPLOYEE'],
              emailVerifiedAt: null,
              lastLoginAt: null,
              updatedAt: new Date().toISOString(),
            },
            preferences: {
              preferredName: 'Luan',
              phoneNumber: '+55 21 97777-0000',
              emergencyContactName: null,
              emergencyContactPhone: null,
              primaryBase: 'Macae',
              notificationChannel: 'WHATSAPP',
              updatedAt: new Date().toISOString(),
            },
            editableFields: ['preferredName', 'phoneNumber'],
          },
        }), { status: 200 });
      }

      if (url.pathname.endsWith('/auth/me/profile')) {
        return new Response(JSON.stringify({
          item: {
            official: {
              userId: 'user-1',
              email: 'luan@example.test',
              fullName: 'Luan Silva Santos',
              documentMasked: '***.456.789-**',
              birthDate: null,
              employeeNumber: 'FRI-01-4717',
              departmentName: 'Operacoes',
              accountStatus: 'ACTIVE',
              roles: ['EMPLOYEE'],
              emailVerifiedAt: null,
              lastLoginAt: null,
              updatedAt: new Date().toISOString(),
            },
            preferences: {
              preferredName: 'Luan',
              phoneNumber: '+55 21 98888-1204',
              emergencyContactName: null,
              emergencyContactPhone: null,
              primaryBase: 'Macae',
              notificationChannel: 'EMAIL',
              updatedAt: new Date().toISOString(),
            },
            editableFields: ['preferredName', 'phoneNumber'],
          },
        }), { status: 200 });
      }

      return new Response(JSON.stringify({ message: 'not found' }), { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);
    persistAuthSession({
      accessToken: 'access',
      refreshToken: 'refresh',
      tokenType: 'Bearer',
      user: {
        id: 'user-1',
        email: 'luan@example.test',
        employeeId: 'FRI-01-4717',
        fullName: 'Luan Silva Santos',
        roles: ['EMPLOYEE'],
        status: 'ACTIVE',
        emailVerifiedAt: null,
      },
    });

    renderWithQueryClient(<ProfilePage />);

    await user.click(screen.getByRole('tab', { name: /Contato/i }));
    const phoneInput = await screen.findByLabelText('Telefone');
    await user.clear(phoneInput);
    await user.type(phoneInput, '+55 21 97777-0000');
    await user.click(screen.getByRole('button', { name: /Salvar/i }));

    expect(await screen.findByText('Ajustes salvos.')).toBeInTheDocument();
    const patchCall = fetchMock.mock.calls.find((call) => call[1]?.method === 'PATCH');
    expect(patchCall?.[0]).toContain('/auth/me/profile');
    expect(String(patchCall?.[1]?.body)).toContain('+55 21 97777-0000');
  });
});
