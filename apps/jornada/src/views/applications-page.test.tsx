import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { persistAuthSession } from '../features/auth/auth-session';
import type { AuthSessionSnapshot } from '../features/auth/auth-session';
import { ApplicationsPage } from './applications-page';

const session = {
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
      id: 'app-jornada',
      code: 'JORNADA',
      name: 'Jornada',
      description:
        'Acompanhe a programacao de embarque e os vencimentos de ASO e treinamentos.',
      entryKind: 'NATIVE' as const,
      entryPath: '/inbox',
      isDefault: true,
      roles: ['USER']
    },
    {
      id: 'app-help-hub',
      code: 'HELP_HUB',
      name: 'Focall',
      description: 'Atendimentos e suporte ao colaborador.',
      entryKind: 'NATIVE' as const,
      entryPath: '/atendimentos',
      isDefault: false,
      roles: ['ADMIN']
    }
  ]
} satisfies AuthSessionSnapshot;

describe('ApplicationsPage', () => {
  beforeEach(() => {
    localStorage.clear();
    persistAuthSession(session);
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('renders the authorized applications as an accessible grid', () => {
    renderPage();

    expect(
      screen.getByRole('grid', { name: 'Aplicativos disponiveis' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Jornada')).toBeInTheDocument();
    expect(screen.getByText('Focall')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Acompanhe a programacao de embarque e os vencimentos de ASO e treinamentos.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Atendimentos e suporte ao colaborador.')).toBeInTheDocument();
    expect(screen.queryByText('Acesso central')).not.toBeInTheDocument();
    expect(screen.queryByText('Aplicativo')).not.toBeInTheDocument();
  });

  it('keeps the catalog visible when it is rendered by the neutral hub', () => {
    persistAuthSession({ ...session, applications: [session.applications[0]] });

    renderPage({ alwaysShowCatalog: true });

    expect(
      screen.getByRole('grid', { name: 'Aplicativos disponiveis' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Jornada')).toBeInTheDocument();
  });

  it('filters the catalog by the Hub search query', () => {
    renderPage({ initialEntry: '/aplicativos?q=suporte' });

    expect(screen.queryByText('Jornada')).not.toBeInTheDocument();
    expect(screen.getByText('Focall')).toBeInTheDocument();
    expect(screen.getByText('App')).toBeInTheDocument();
  });

  it('opens a native module locally without issuing an SSO transition', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByText('Focall'));

    expect(screen.getByTestId('current-path')).toHaveTextContent('/atendimentos');
  });
});

function renderPage({
  alwaysShowCatalog = false,
  initialEntry = '/aplicativos',
}: {
  alwaysShowCatalog?: boolean;
  initialEntry?: string;
} = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <ApplicationsPage alwaysShowCatalog={alwaysShowCatalog} />
        <CurrentPath />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function CurrentPath() {
  const location = useLocation();

  return <output data-testid="current-path">{location.pathname}</output>;
}
