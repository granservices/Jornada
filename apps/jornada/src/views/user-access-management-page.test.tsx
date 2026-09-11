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
          ],
        });
      }

      if (url.includes('/auth/admin/users/user-1/applications/JORNADA') && init?.method === 'PUT') {
        return jsonResponse({ item: {} });
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
