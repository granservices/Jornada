import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { persistAuthSession } from '../auth/auth-session';
import { AppShellLayout, type SupportWorkspacePort } from './app-shell-layout';

const supportSession = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  tokenType: 'Bearer',
  user: {
    id: 'support-user', email: 'support@granservices.com.br', employeeId: null,
    fullName: 'Agente de suporte', roles: ['SUPPORT'], status: 'ACTIVE', emailVerifiedAt: null,
  },
  applications: [{
    id: 'help-hub', code: 'HELP_HUB', name: 'HelpHub', description: null,
    entryPath: '/atendimentos', isDefault: true, roles: ['AGENT'],
  }],
};

describe('AppShellLayout workspace port', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('does not expose the support dock when an app does not provide a workspace port', () => {
    persistAuthSession(supportSession);
    renderShell();

    expect(screen.queryByText('Workspace ativo')).not.toBeInTheDocument();
  });

  it('uses the shared Jornada frame and navigation for the HelpHub experience', () => {
    persistAuthSession(supportSession);
    const { container } = renderShell(undefined, '/atendimentos');

    expect(container.querySelector('.neo-app-frame')).toBeInTheDocument();
    expect(screen.getByLabelText('Navegacao principal')).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Atendimentos' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Atendimentos' }).length).toBeGreaterThan(0);
  });

  it('uses the injected workspace port to show an active support case', async () => {
    persistAuthSession(supportSession);
    const workspace: SupportWorkspacePort = {
      addMessage: async () => undefined,
      getCase: async () => ({
        item: {
          id: 'case-1', code: 'SUP-001', title: 'Solicitacao de teste', status: 'OPEN',
          teamName: 'TI', department: { name: 'Tecnologia' }, requester: { name: 'Colaborador' },
          messages: [],
        },
      }),
    };

    renderShell(workspace);

    expect(await screen.findByText('Solicitacao de teste')).toBeInTheDocument();
    expect(screen.getByText('Workspace ativo')).toBeInTheDocument();
  });
});

function renderShell(
  supportWorkspace?: SupportWorkspacePort,
  initialEntry = '/programacao?caso=case-1&dock=1',
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([
    {
      element: <AppShellLayout experience="atendimento" supportWorkspace={supportWorkspace} />,
      children: [
        { path: '/programacao', element: <div>Programacao</div> },
        { path: '/atendimentos', element: <div>Atendimentos</div> },
      ],
    },
  ], { initialEntries: [initialEntry] });

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}
