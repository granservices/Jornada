import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { persistAuthSession } from '../features/auth/auth-session';
import { AdminWorkerPreviewProvider } from '../features/admin-worker-preview/admin-worker-preview-context';
import { AppShellLayout } from './app-shell-layout';

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
  applications: [
    {
      id: 'app-jornada',
      code: 'JORNADA',
      name: 'Jornada',
      description: 'Portal do colaborador',
      entryPath: '/inbox',
      isDefault: true,
      roles: ['ADMIN'],
    },
    {
      id: 'app-help-hub',
      code: 'HELP_HUB',
      name: 'Focall',
      description: 'Workspace operacional',
      entryPath: '/atendimentos',
      isDefault: false,
      roles: ['ADMIN'],
    },
    {
      id: 'app-quick-forms',
      code: 'QUICK_FORMS',
      name: 'QuickForms',
      description: 'Criador de formularios',
      entryPath: '/formularios',
      isDefault: false,
      roles: ['ADMIN'],
    },
  ],
};

const employeeSession = {
  ...adminSession,
  user: {
    ...adminSession.user,
    id: 'employee-user',
    email: 'colaborador@granservices.com.br',
    fullName: 'Colaborador Gran',
    roles: ['EMPLOYEE'],
  },
  applications: [
    {
      id: 'app-jornada',
      code: 'JORNADA',
      name: 'Jornada',
      description: 'Portal do colaborador',
      entryPath: '/inbox',
      isDefault: true,
      roles: ['USER'],
    },
  ],
};

describe('AppShellLayout', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    persistAuthSession(adminSession);
    vi.spyOn(globalThis, 'fetch').mockImplementation(mockShellFetch);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('auto-expands the desktop sidebar on hover and supports lock states', async () => {
    const user = userEvent.setup();
    renderShell();

    const sidebar = screen.getByLabelText('Navegacao principal');
    const sidebarRail = screen.getByTestId('desktop-sidebar-rail');
    expect(sidebar).toHaveAttribute('data-sidebar-state', 'collapsed');
    expect(sidebar).toHaveAttribute('data-sidebar-lock', 'auto');
    expect(sidebarRail).toHaveAttribute('data-sidebar-rail', 'collapsed');

    await user.hover(sidebar);

    await waitFor(() =>
      expect(sidebar).toHaveAttribute('data-sidebar-state', 'expanded'),
    );
    expect(sidebarRail).toHaveAttribute('data-sidebar-rail', 'expanded');

    await user.click(screen.getByLabelText('Travar menu lateral'));
    await user.unhover(sidebar);

    expect(sidebar).toHaveAttribute('data-sidebar-state', 'expanded');
    expect(sidebar).toHaveAttribute('data-sidebar-lock', 'open');
    expect(sidebarRail).toHaveAttribute('data-sidebar-rail', 'expanded');
    expect(localStorage.getItem('jornada.sidebar.lockMode')).toBe('open');

    await user.click(screen.getByLabelText('Manter menu lateral fechado'));

    expect(sidebar).toHaveAttribute('data-sidebar-state', 'collapsed');
    expect(sidebar).toHaveAttribute('data-sidebar-lock', 'closed');
    expect(localStorage.getItem('jornada.sidebar.lockMode')).toBe('closed');
  }, 10000);

  it('shows the support workspace dock outside the support route and preserves it in navigation links', async () => {
    const user = userEvent.setup();
    renderShell('/inbox?dock=1&caso=case-1&aba=conversa');

    expect(await screen.findByText('Workspace ativo')).toBeInTheDocument();
    expect(await screen.findByText('Contracheque pendente')).toBeInTheDocument();
    expect(await screen.findByText('Bom dia, preciso do contracheque.')).toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: 'Perfil' }).every(
        (link) => link.getAttribute('href') === '/perfil?dock=1&caso=case-1&aba=conversa',
      ),
    ).toBe(true);

    const replyInput = screen.getByLabelText('Responder pelo workspace');
    await user.type(replyInput, ' Rascunho local');

    expect(
      sessionStorage.getItem('jornada.support.workspace.draft.case-1'),
    ).toBe(' Rascunho local');

    await user.click(screen.getByLabelText('Minimizar workspace do atendimento'));

    expect(
      screen.getByLabelText('Reabrir workspace do atendimento'),
    ).toBeInTheDocument();

    await user.click(screen.getByLabelText('Reabrir workspace do atendimento'));

    expect(screen.getByLabelText('Responder pelo workspace')).toHaveValue(
      ' Rascunho local',
    );
  }, 10000);

  it('hides operational navigation when the session only has access to Jornada', () => {
    renderShell('/inbox', employeeSession);

    expect(screen.queryByRole('link', { name: 'Atendimentos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Formularios' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Inbox' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Perfil' }).length).toBeGreaterThan(0);
  });

  it('shows only atendimento navigation in the atendimento experience', () => {
    renderShell('/atendimentos', adminSession, 'atendimento');

    expect(screen.getAllByRole('link', { name: 'Atendimentos' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: 'Formularios' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Inbox' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Programação' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Vencimentos' })).not.toBeInTheDocument();
  });

  it('shows only form navigation in the QuickForms experience', () => {
    renderShell('/formularios', adminSession, 'quick-forms');

    expect(screen.getAllByRole('link', { name: 'Formularios' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: 'Atendimentos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Inbox' })).not.toBeInTheDocument();
  });

  it('keeps identity and authorized module switching in the header', async () => {
    const user = userEvent.setup();
    renderShell('/inbox', adminSession);

    expect(screen.queryByText('Acesso Neo')).not.toBeInTheDocument();
    expect(screen.getByText('Admin Jornada')).toBeInTheDocument();
    expect(screen.getByText('Administrador')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Modulos' })).toHaveAttribute(
      'href',
      '/aplicativos',
    );
    expect(screen.queryByRole('link', { name: 'Aplicativos' })).not.toBeInTheDocument();

    const moduleSwitch = screen.getByTestId('module-switch');
    expect(moduleSwitch).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Modulo atual/ })).toHaveTextContent('Jornada');

    await user.click(screen.getByRole('button', { name: /Modulo atual/ }));
    expect(screen.getByRole('option', { name: 'Jornada' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Focall' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'QuickForms' })).toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: 'Focall' }));

    expect(await screen.findByText('Atendimentos content')).toBeInTheDocument();
  });

  it('lets admins choose a global worker preview in the Jornada shell', async () => {
    const user = userEvent.setup();
    renderShell('/inbox', adminSession);

    await user.type(screen.getByLabelText('Selecionar colaborador para validar Jornada'), 'Gero');
    await user.click(screen.getByRole('button', { name: 'Buscar colaborador' }));

    expect(await screen.findByText('Gero Andrade de Souza')).toBeInTheDocument();
    expect(screen.getByText('FRI-01-10014 - Unidade Offshore')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Gero Andrade de Souza/ }));

    expect(screen.getByLabelText(/Colaborador em validação: Gero Andrade de Souza/)).toBeInTheDocument();

    await user.click(screen.getByLabelText(/Colaborador em validação: Gero Andrade de Souza/));
    await user.click(screen.getByLabelText('Limpar colaborador em validação'));

    expect(screen.getByLabelText('Selecionar colaborador para validar Jornada')).toBeInTheDocument();
  });
});

function renderShell(
  initialEntry = '/inbox',
  session = adminSession,
  experience: 'worker' | 'atendimento' | 'quick-forms' = 'worker',
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  localStorage.clear();
  sessionStorage.clear();
  persistAuthSession(session);

  return render(
    <QueryClientProvider client={queryClient}>
      <AdminWorkerPreviewProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route element={<AppShellLayout experience={experience} />}>
              <Route path="/inbox" element={<div>Inbox content</div>} />
              <Route path="/atendimentos" element={<div>Atendimentos content</div>} />
              <Route path="/formularios" element={<div>Formularios content</div>} />
              <Route path="/perfil" element={<div>Perfil content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AdminWorkerPreviewProvider>
    </QueryClientProvider>,
  );
}

async function mockShellFetch(input: RequestInfo | URL) {
  const url = new URL(String(input));

  if (url.pathname.endsWith('/boarding-schedule/preview/workers')) {
    return jsonResponse({
      items: [
        {
          previewReference: 'reference-without-external-worker-id-1234567890',
          fullName: 'Gero Andrade de Souza',
          employeeNumber: 'FRI-01-10014',
          operationalUnitName: 'Unidade Offshore',
        },
      ],
    });
  }

  if (url.pathname.endsWith('/support/cases/case-1')) {
    return jsonResponse({
      item: {
        id: 'case-1',
        code: 'ATD-000777',
        title: 'Contracheque pendente',
        description: 'Bom dia, preciso do contracheque.',
        status: 'OPEN',
        priority: 'NORMAL',
        department: {
          id: 'dept-payroll',
          code: 'PAYROLL',
          name: 'Departamento Pessoal',
        },
        topic: {
          id: 'topic-payslip',
          code: 'PAYSLIP',
          name: 'Contracheque',
        },
        teamCode: 'PAYROLL',
        teamName: 'Departamento Pessoal',
        requester: {
          id: 'employee-user',
          name: 'Colaborador Gran',
          email: 'colaborador@granservices.com.br',
        },
        assignedUser: null,
        rating: null,
        originConversationId: null,
        dueAt: null,
        resolvedAt: null,
        closedAt: null,
        createdAt: '2026-08-27T13:00:00.000Z',
        updatedAt: '2026-08-27T13:10:00.000Z',
        events: [],
        messages: [
          {
            id: 'message-1',
            body: 'Bom dia, preciso do contracheque.',
            senderName: 'Colaborador Gran',
            mine: false,
            createdAt: '2026-08-27T13:01:00.000Z',
          },
        ],
        fieldValues: [],
      },
    });
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
