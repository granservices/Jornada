import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { persistAuthSession } from '../features/auth/auth-session';
import { UserAccessManagementPage } from './user-access-management-page';

describe('UserAccessManagementPage', () => {
  beforeEach(() => {
    localStorage.clear();
    persistAuthSession({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      tokenType: 'Bearer',
      user: {
        id: 'admin-user',
        email: 'admin@granservices.com.br',
        employeeId: null,
        fullName: 'Admin Neo',
        roles: ['ADMIN'],
        status: 'ACTIVE',
        emailVerifiedAt: null,
      },
    });
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.includes('/auth/admin/users/application-access')) {
        return jsonResponse({
          items: [
            {
              id: 'user-1',
              email: 'colaborador@granservices.com.br',
              status: 'ACTIVE',
              globalRoles: ['EMPLOYEE'],
              fullName: 'Colaborador Gran',
              employeeId: '1001',
              createdAt: '2026-09-02T10:00:00.000Z',
              updatedAt: '2026-09-02T10:00:00.000Z',
              applications: [
                {
                  id: 'app-jornada',
                  code: 'JORNADA',
                  name: 'Jornada',
                  description: 'Programacao',
                  entryPath: '/inbox',
                  status: 'ACTIVE',
                  isDefault: true,
                  roles: ['MEMBER'],
                },
              ],
            },
            {
              id: 'user-pending',
              email: 'pendente@granservices.com.br',
              status: 'PENDING',
              globalRoles: [],
              fullName: 'Pessoa Pendente',
              employeeId: null,
              createdAt: '2026-09-02T10:00:00.000Z',
              updatedAt: '2026-09-02T10:00:00.000Z',
              applications: [
                {
                  id: 'app-jornada',
                  code: 'JORNADA',
                  name: 'Jornada',
                  description: 'Programacao',
                  entryPath: '/inbox',
                  status: 'ACTIVE',
                  isDefault: true,
                  roles: ['MEMBER'],
                },
              ],
            },
          ],
        });
      }

      if (url.endsWith('/auth/admin/applications') && !init?.method) {
        return jsonResponse({
          items: [
            {
              id: 'app-jornada',
              code: 'JORNADA',
              name: 'Jornada',
              description: 'Programacao',
              entryKind: 'NATIVE',
              entryPath: '/inbox',
              imageUrl: null,
              sortOrder: 10,
              status: 'ACTIVE',
              createdAt: '2026-09-02T10:00:00.000Z',
              updatedAt: '2026-09-02T10:00:00.000Z',
            },
            {
              id: 'app-crew',
              code: 'CREW_OPS',
              name: 'CrewOps',
              description: 'Operacao externa',
              entryKind: 'REDIRECT',
              entryPath: 'https://crew.example.com',
              imageUrl: null,
              sortOrder: 20,
              status: 'ACTIVE',
              createdAt: '2026-09-02T10:00:00.000Z',
              updatedAt: '2026-09-02T10:00:00.000Z',
            },
          ],
        });
      }

      if (url.includes('/auth/admin/users/user-1/applications/JORNADA') && init?.method === 'PUT') {
        return jsonResponse({ item: {} });
      }

      if (url.includes('/auth/admin/users/user-1/applications/CREW_OPS') && init?.method === 'PUT') {
        return jsonResponse({ item: {} });
      }

      if (url.includes('/auth/admin/users/invitations') && init?.method === 'POST') {
        const body = JSON.parse(String(init.body)) as { email: string };

        return jsonResponse({
          item: {
            invitationId: 'invite-1',
            userId: 'user-created',
            email: body.email,
            status: 'PENDING',
            deliveryStatus: 'PREVIEW',
            expiresAt: '2026-10-30T10:00:00.000Z',
            previewToken: 'preview-token',
          },
        });
      }

      if (url.includes('/auth/admin/users/user-pending/invitations') && init?.method === 'POST') {
        return jsonResponse({
          item: {
            invitationId: 'invite-2',
            userId: 'user-pending',
            email: 'pendente@granservices.com.br',
            status: 'PENDING',
            deliveryStatus: 'PREVIEW',
            expiresAt: '2026-10-30T10:00:00.000Z',
            previewToken: 'resent-preview-token',
          },
        });
      }

      return jsonResponse({ message: 'Rota inesperada' }, 500);
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('lists a user and saves contextual roles for an active application', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Colaborador Gran')).toBeInTheDocument();
    expect(screen.getByText('Jornada')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Editar papeis/ }));
    await user.click(screen.getByRole('checkbox', { name: 'Gestor' }));
    await user.click(screen.getByRole('button', { name: 'Salvar papeis' }));

    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/admin/users/user-1/applications/JORNADA'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ enabled: true, isDefault: true, roles: ['MEMBER', 'MANAGER'] }),
        }),
      ),
    );
  });

  it('creates an administrative invitation with the explicitly selected module access', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Convidar usuario' }));
    await user.type(screen.getByLabelText('Nome completo'), 'Pessoa Convidada');
    await user.type(screen.getByLabelText('Email'), 'pessoa@example.com');
    await user.click(screen.getByRole('checkbox', { name: 'Jornada' }));
    await user.click(screen.getByRole('button', { name: 'Enviar convite' }));

    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/admin/users/invitations'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            fullName: 'Pessoa Convidada',
            email: 'pessoa@example.com',
            employeeId: undefined,
            reason: 'ONBOARDING',
            applications: [{ code: 'JORNADA', roles: ['MEMBER'], isDefault: true }],
          }),
        }),
      ),
    );
  });

  it('shows the development invitation link returned by the API', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Convidar usuario' }));
    await user.type(screen.getByLabelText('Nome completo'), 'Pessoa Convidada');
    await user.type(screen.getByLabelText('Email'), 'pessoa@example.com');
    await user.click(screen.getByRole('checkbox', { name: 'Jornada' }));
    await user.click(screen.getByRole('button', { name: 'Enviar convite' }));

    expect(await screen.findByText('Convite criado')).toBeInTheDocument();
    expect(screen.getByText('pessoa@example.com')).toBeInTheDocument();
    expect(screen.getByText(/\/convite\?token=preview-token/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir convite' })).toBeInTheDocument();
  });

  it('resends access for a pending user and shows the new development invitation link', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /Pessoa Pendente/ }));
    await user.click(screen.getByRole('button', { name: 'Reenviar acesso' }));

    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/admin/users/user-pending/invitations'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            reason: 'ACCESS_CORRECTION',
            reasonComment: 'Reenvio solicitado pela administracao.',
          }),
        }),
      ),
    );
    expect(await screen.findByText('Convite criado')).toBeInTheDocument();
    expect(screen.getAllByText('pendente@granservices.com.br').length).toBeGreaterThan(0);
    expect(screen.getByText(/\/convite\?token=resent-preview-token/)).toBeInTheDocument();
  });

  it('grants a catalog application that does not declare custom contextual roles', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('CrewOps')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Conceder/ }));

    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/admin/users/user-1/applications/CREW_OPS'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ enabled: true, isDefault: false, roles: ['MEMBER'] }),
        }),
      ),
    );
  });

  it('uses the default contextual role when inviting a user to a catalog application', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Convidar usuario' }));
    await user.type(screen.getByLabelText('Nome completo'), 'Pessoa Crew');
    await user.type(screen.getByLabelText('Email'), 'crew@example.com');
    await user.click(screen.getByRole('checkbox', { name: 'CrewOps' }));
    await user.click(screen.getByRole('button', { name: 'Enviar convite' }));

    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/admin/users/invitations'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            fullName: 'Pessoa Crew',
            email: 'crew@example.com',
            employeeId: undefined,
            reason: 'ONBOARDING',
            applications: [{ code: 'CREW_OPS', roles: ['MEMBER'], isDefault: true }],
          }),
        }),
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
      <UserAccessManagementPage />
    </QueryClientProvider>,
  );
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
