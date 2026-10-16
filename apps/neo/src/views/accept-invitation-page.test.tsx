import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAuthSessionSnapshot } from '../features/auth/auth-session';
import { AcceptInvitationPage } from './accept-invitation-page';

describe('AcceptInvitationPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('accepts a manually pasted development invitation link when the route has no token', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        tokenType: 'Bearer',
        user: {
          id: 'user-1',
          email: 'pessoa@example.com',
          employeeId: null,
          fullName: 'Pessoa Convidada',
          roles: ['EMPLOYEE'],
          status: 'ACTIVE',
          emailVerifiedAt: '2026-10-01T10:00:00.000Z',
        },
        applications: [
          {
            id: 'app-jornada',
            code: 'JORNADA',
            name: 'Jornada',
            description: null,
            entryKind: 'NATIVE',
            entryPath: '/inbox',
            imageUrl: null,
            isDefault: true,
            roles: ['MEMBER'],
          },
        ],
      }),
    );

    render(
      <MemoryRouter initialEntries={['/convite']}>
        <AcceptInvitationPage />
      </MemoryRouter>,
    );

    await user.type(
      screen.getByLabelText('Token ou link do convite'),
      'http://localhost:3006/convite?token=manual-token',
    );
    await user.type(screen.getByLabelText('Nova senha'), 'NovaSenha@123');
    await user.type(screen.getByLabelText('Confirmar senha'), 'NovaSenha@123');
    await user.click(screen.getByRole('button', { name: 'Entrar no Neo Jornada' }));

    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/invitations/accept'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ token: 'manual-token', password: 'NovaSenha@123' }),
        }),
      ),
    );
    expect(getAuthSessionSnapshot()?.user.email).toBe('pessoa@example.com');
  });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
