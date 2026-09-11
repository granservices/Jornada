import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { persistAuthSession } from '../features/auth/auth-session';
import { CommunicationsPage } from './communications-page';

describe('CommunicationsPage', () => {
  beforeEach(() => {
    localStorage.clear();
    persistAuthSession({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      tokenType: 'Bearer',
      user: {
        id: 'worker-1',
        email: 'worker@example.com',
        employeeId: 'GRN-001',
        fullName: 'Pessoa Trabalhadora',
        roles: [],
        status: 'ACTIVE',
        emailVerifiedAt: null,
      },
      applications: [
        { id: 'jornada', code: 'JORNADA', name: 'Jornada', description: null, entryKind: 'NATIVE', entryPath: '/inbox', imageUrl: null, isDefault: true, roles: ['MEMBER'] },
        { id: 'focall', code: 'HELP_HUB', name: 'Focall', description: null, entryKind: 'NATIVE', entryPath: '/atendimentos', imageUrl: null, isDefault: false, roles: ['REQUESTER'] },
      ],
    });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('keeps communication owned by Jornada while exposing a contextual support contact', () => {
    render(
      <MemoryRouter>
        <CommunicationsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Atualizacao de embarque' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Falar com atendimento/ })).toHaveAttribute(
      'href',
      '/atendimento?modo=new&communicationId=communication_ops_001&sourceModule=JORNADA',
    );
  });
});
