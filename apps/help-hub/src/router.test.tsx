import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { persistAuthSession } from '@jornada/frontend-core/auth';
import { AppShellLayout } from '@jornada/frontend-core/app-shell';

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
    emailVerifiedAt: null
  },
  applications: [
    {
      id: 'app-help-hub',
      code: 'HELP_HUB',
      name: 'HelpHub',
      description: 'Workspace operacional',
      entryPath: '/atendimentos',
      isDefault: true,
      roles: ['ADMIN']
    }
  ]
};

describe('atendimento router shell', () => {
  it('shows operational navigation without worker modules', async () => {
    persistAuthSession(adminSession);
    renderOpsShell('/atendimentos');

    await waitFor(() => expect(screen.getByText('Atendimentos content')).toBeInTheDocument());
    expect(screen.getAllByRole('link', { name: 'Atendimentos' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: 'Formularios' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Inbox' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Programação' })).not.toBeInTheDocument();
  });
});

function renderOpsShell(initialEntry: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  const router = createMemoryRouter([
    {
      element: <AppShellLayout experience="atendimento" />,
      children: [
        {
          path: '/atendimentos',
          element: <div>Atendimentos content</div>
        }
      ]
    }
  ], {
    initialEntries: [initialEntry]
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
