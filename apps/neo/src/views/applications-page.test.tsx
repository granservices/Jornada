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
      id: 'app-tickets',
      code: 'TICKETS',
      name: 'Tickets',
      description: 'Atendimentos e suporte ao colaborador.',
      entryKind: 'NATIVE' as const,
      entryPath: '/atendimentos',
      isDefault: false,
      roles: ['ADMIN']
    },
    {
      id: 'app-quick-forms',
      code: 'QUICK_FORMS',
      name: 'QuickForms',
      description: 'Formulários e respostas operacionais.',
      entryKind: 'NATIVE' as const,
      entryPath: '/formularios',
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

    expect(screen.getByRole('grid', { name: 'Módulos disponíveis' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /A informação ao seu alcance/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Jornada' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tickets' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'QuickForms' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Neo' })).toBeInTheDocument();
    expect(screen.getByText('Sua rotina, sob controle.')).toBeInTheDocument();
    expect(screen.getByText('Atendimento operacional.')).toBeInTheDocument();
    expect(screen.queryByText('Acesso central')).not.toBeInTheDocument();
    expect(screen.getAllByText('Aplicativo')).toHaveLength(3);
    expect(screen.getByText('Plataforma')).toBeInTheDocument();
  });

  it('keeps the catalog visible when it is rendered by the neutral hub', () => {
    persistAuthSession({ ...session, applications: [session.applications[0]] });

    renderPage({ alwaysShowCatalog: true });

    expect(screen.getByRole('grid', { name: 'Módulos disponíveis' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Jornada' })).toBeInTheDocument();
  });

  it('filters the catalog by the Hub search query', () => {
    renderPage({ initialEntry: '/aplicativos?q=formulários' });

    expect(screen.queryByRole('heading', { name: 'Jornada' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'QuickForms' })).toBeInTheDocument();
    expect(screen.getByText('Formulários e respostas.')).toBeInTheDocument();
  });

  it('opens a native module locally without issuing an SSO transition', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('heading', { name: 'Tickets' }));

    expect(screen.getByTestId('current-path')).toHaveTextContent('/atendimentos');
  });

  it('makes the top actions interactive', async () => {
    const user = userEvent.setup();
    renderPage({ initialEntry: '/aplicativos?q=formulários&categoria=quickforms' });

    expect(screen.queryByRole('heading', { name: 'Jornada' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ver todos os módulos' }));

    expect(screen.getByRole('heading', { name: 'Jornada' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Abrir comunicados' }));

    expect(screen.getByTestId('current-path')).toHaveTextContent('/comunicados');
  });

  it('opens the user menu and supports profile and logout actions', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Abrir menu do usuário' }));
    await user.click(screen.getByRole('menuitem', { name: 'Perfil' }));

    expect(screen.getByTestId('current-path')).toHaveTextContent('/perfil');

    await user.click(screen.getByRole('button', { name: 'Abrir menu do usuário' }));
    await user.click(screen.getByRole('menuitem', { name: 'Sair' }));

    expect(screen.getByTestId('current-path')).toHaveTextContent('/login');
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
