import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { clearAuthSession, persistAuthSession } from '../features/auth/auth-session';
import { AdminWorkerPreviewProvider } from '../features/admin-worker-preview/admin-worker-preview-context';
import type { DrakeWorkerPreview } from '../features/schedule/schedule-api';
import { ExpirationsPage } from './expirations-page';

function renderWithQueryClient(ui: ReactElement, selectedWorker: DrakeWorkerPreview | null = null) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <AdminWorkerPreviewProvider initialSelectedWorker={selectedWorker}>
          {ui}
        </AdminWorkerPreviewProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

function isoDaysFromNow(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

describe('ExpirationsPage', () => {
  afterEach(() => {
    clearAuthSession();
    vi.unstubAllGlobals();
    cleanup();
  });

  it('renders a table-like due-date ordered list and keeps filters working', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<ExpirationsPage />);

    const list = screen.getByRole('list', { name: 'Lista de vencimentos' });
    const rows = within(list).getAllByRole('listitem');

    expect(rows).toHaveLength(5);
    expect(within(rows[0]).getByText('HUET')).toBeInTheDocument();
    expect(within(rows[1]).getByText('ASO periódico')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Identificação offshore')).toBeInTheDocument();
    expect(within(rows[0]).getByLabelText('Situação: Vencido')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Atenção/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Filtrar vencimentos')).toBeInTheDocument();
    expect(within(rows[0]).getByRole('link', { name: /Treinamento/i })).toHaveAttribute(
      'href',
      '/atendimento?modo=new&setor=TRAINING&assunto=CERTIFICATE',
    );
    expect(within(rows[0]).getByRole('link', { name: /Treinamento/i })).toHaveClass('w-full');
    expect(within(rows[0]).getByRole('link', { name: /Treinamento/i })).toHaveClass('sm:w-[112px]');
    expect(within(rows[1]).getByRole('link', { name: /Medicina/i })).toHaveAttribute(
      'href',
      '/atendimento?modo=new&setor=MEDICINE&assunto=ASO',
    );

    await user.selectOptions(screen.getByLabelText('Filtrar vencimentos'), 'documents');

    const filteredRows = within(list).getAllByRole('listitem');
    expect(filteredRows).toHaveLength(1);
    expect(within(filteredRows[0]).getByText('Identificação offshore')).toBeInTheDocument();
    expect(within(filteredRows[0]).getByRole('button', { name: /Atualizar/i })).toBeInTheDocument();
  });

  it('loads the protected internal requirements endpoint for the signed-in employee', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({
      items: [
        {
          requirementId: 'drake_hash_b',
          type: 'TRAINING',
          title: 'NR-35',
          expiresAt: isoDaysFromNow(140),
          status: 'VALID',
          severity: 'low',
          issuerLabel: 'Drake',
          action: { label: 'Ver vencimentos', route: '/vencimentos' },
          externalWorkerId: 'worker-should-not-render',
        },
        {
          requirementId: 'drake_hash_a',
          type: 'ASO',
          title: 'ASO periodico',
          expiresAt: isoDaysFromNow(3),
          status: 'DUE_SOON',
          severity: 'critical',
          issuerLabel: 'Drake',
          action: { label: 'Ver vencimentos', route: '/vencimentos' },
          externalWorkerId: 'worker-should-not-render',
        },
        {
          requirementId: 'drake_hash_c',
          type: 'TRAINING',
          title: 'NR-33 sem data',
          expiresAt: null,
          status: 'PENDING',
          severity: 'medium',
          issuerLabel: 'Drake',
          action: { label: 'Ver vencimentos', route: '/vencimentos' },
          externalWorkerId: 'worker-should-not-render',
        },
      ],
      source: { label: 'Drake', updatedAt: '2026-09-09T12:00:00.000Z' },
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    persistAuthSession({
      accessToken: 'access', refreshToken: 'refresh', tokenType: 'Bearer',
      user: { id: 'employee-1', email: 'employee@example.test', employeeId: 'REG-1', fullName: 'Colaborador', roles: ['EMPLOYEE'], status: 'ACTIVE', emailVerifiedAt: null },
    });

    renderWithQueryClient(<ExpirationsPage />);

    expect(await screen.findByText('ASO periodico')).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Lista de vencimentos' });
    const rows = within(list).getAllByRole('listitem');
    expect(within(rows[0]).getByText('ASO periodico')).toBeInTheDocument();
    expect(within(rows[1]).getByText('NR-35')).toBeInTheDocument();
    expect(within(rows[2]).getByText('NR-33 sem data')).toBeInTheDocument();
    expect(within(rows[0]).getByLabelText('Situação: Próximo do vencimento')).toBeInTheDocument();
    expect(within(rows[1]).getByLabelText('Situação: Em dia')).toBeInTheDocument();
    expect(within(rows[2]).getByLabelText('Situação: Sem data')).toBeInTheDocument();
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/expiring-requirements/me');
    expect(screen.queryByText('worker-should-not-render')).not.toBeInTheDocument();
  });

  it('lets an admin select a worker through an opaque preview reference', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        items: [
          {
            requirementId: 'drake_hash_a',
            type: 'TRAINING',
            title: 'HUET real',
            expiresAt: isoDaysFromNow(12),
            status: 'DUE_SOON',
            severity: 'high',
            issuerLabel: 'Drake',
            action: { label: 'Ver vencimentos', route: '/vencimentos' },
            externalWorkerId: 'worker-should-not-render',
          },
        ],
        source: { label: 'Drake', updatedAt: '2026-09-09T12:00:00.000Z' },
      }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    persistAuthSession({
      accessToken: 'access',
      refreshToken: 'refresh',
      tokenType: 'Bearer',
      user: {
        id: 'admin-1',
        email: 'admin@example.test',
        employeeId: null,
        fullName: 'Admin',
        roles: ['ADMIN'],
        status: 'ACTIVE',
        emailVerifiedAt: null,
      },
    });

    renderWithQueryClient(<ExpirationsPage />, {
      previewReference: 'reference-without-external-worker-id-1234567890',
      fullName: 'Gero Andrade de Souza',
      employeeNumber: 'FRI-01-10014',
      operationalUnitName: 'Unidade Offshore',
    });

    expect(await screen.findByText('HUET real')).toBeInTheDocument();
    expect(screen.getByText(/Validação global: Gero Andrade de Souza/)).toBeInTheDocument();
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/expiring-requirements/preview?previewReference=reference-without-external-worker-id-1234567890');
    expect(fetchMock.mock.calls.flatMap((call) => call).join(' ')).not.toContain('drake.bz');
    expect(screen.queryByText('worker-should-not-render')).not.toBeInTheDocument();
  });
});
