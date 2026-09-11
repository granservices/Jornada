import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { persistAuthSession } from '../../features/auth/auth-session';
import { FormBuilderPage } from './form-builder-page';

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
};

describe('FormBuilderPage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    persistAuthSession(adminSession);
    vi.spyOn(globalThis, 'fetch').mockImplementation(mockApiFetch);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('salva rascunho pela trilha isolada com react aria', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Titulo do formulario'), 'Reembolso');
    expect(screen.getByLabelText('Chave do formulario')).toHaveValue('reembolso');
    expect(screen.getByLabelText('Chave do formulario')).toBeDisabled();
    await user.clear(screen.getByLabelText('Rotulo campo'));
    await user.type(screen.getByLabelText('Rotulo campo'), 'Tipo do reembolso');
    expect(screen.getByLabelText('Codigo campo')).toHaveValue('tipo_do_reembolso');
    expect(screen.getByLabelText('Codigo campo')).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /Salvar rascunho/i }));

    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/forms'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"key":"reembolso"'),
        }),
      ),
    );
    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/forms'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"code":"tipo_do_reembolso"'),
        }),
      ),
    );
    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/forms'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"status":"DRAFT"'),
        }),
      ),
    );
    expect(await screen.findByText('Biblioteca')).toBeInTheDocument();
  }, 30000);

  it('serializa condicionais e exige confirmacao antes de publicar', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Titulo do formulario'), 'Comprovante');
    expect(screen.getByLabelText('Chave do formulario')).toHaveValue('comprovante');

    await user.click(screen.getByRole('button', { name: /Adicionar Selecao/i }));
    await user.click(screen.getByText('Campo de selecao 2'));
    await user.clear(screen.getByLabelText('Rotulo campo'));
    await user.type(screen.getByLabelText('Rotulo campo'), 'Comprovante');
    expect(screen.getByLabelText('Codigo campo')).toHaveValue('comprovante');

    const toggles = screen.getAllByLabelText('Visibilidade condicional ativar');
    await user.click(toggles[0]);
    await user.selectOptions(
      screen.getByLabelText('Visibilidade condicional combinacao'),
      'all',
    );
    await user.selectOptions(
      screen.getByLabelText('Visibilidade condicional campo'),
      'campo_de_texto_1',
    );
    await user.selectOptions(
      screen.getByLabelText('Visibilidade condicional operador'),
      'equals',
    );
    await user.type(screen.getByLabelText('Visibilidade condicional valor'), 'hotel');

    await user.click(screen.getByRole('button', { name: /Publicar/i }));

    expect(screen.getByRole('heading', { name: 'Confirmar publicacao' })).toBeInTheDocument();
    expect(screen.getByText('Novo formulario')).toBeInTheDocument();
    expect(screen.getByText('v1 publicada')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Confirmar publicacao/i }));

    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/forms'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"fieldCode":"campo_de_texto_1"'),
        }),
      ),
    );
    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/forms'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"status":"ACTIVE"'),
        }),
      ),
    );
  }, 30000);

  it('mantem chave e codigo tecnicos apenas como leitura', async () => {
    const user = userEvent.setup();
    renderPage();

    const formKeyInput = screen.getByLabelText('Chave do formulario');
    const fieldCodeInput = screen.getByLabelText('Codigo campo');

    expect(formKeyInput).toBeDisabled();
    expect(fieldCodeInput).toBeDisabled();

    await user.type(screen.getByLabelText('Titulo do formulario'), 'Solicitacao de ASO');
    expect(formKeyInput).toHaveValue('solicitacao_de_aso');

    await user.clear(screen.getByLabelText('Rotulo campo'));
    await user.type(screen.getByLabelText('Rotulo campo'), 'Tipo do ASO');
    expect(fieldCodeInput).toHaveValue('tipo_do_aso');
  });

  it('mantem titulo aberto no inicio e recolhe ao adicionar um novo bloco selecionado', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByLabelText('Titulo do formulario')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Campo de texto 1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Adicionar Selecao/i }));

    expect(screen.getByLabelText('Titulo do formulario')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Campo de selecao 2')).not.toBeInTheDocument();

    await user.click(screen.getByText('Campo de selecao 2'));

    expect(screen.queryByLabelText('Titulo do formulario')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Campo de selecao 2')).toBeInTheDocument();
  });

  it('adiciona secao sem travar e abre o inspector correto', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /Adicionar Secao/i }));
    await user.click(screen.getByText('Secao 2'));

    expect(screen.getByText('Secao 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Titulo secao')).toBeInTheDocument();
    expect(screen.getByText('Solte aqui para preencher a secao')).toBeInTheDocument();
  });

  it('permite editar a secao sem congelar o canvas', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /Adicionar Secao/i }));
    await user.click(screen.getByText('Secao 2'));

    const titleInput = screen.getByLabelText('Titulo secao');
    await user.clear(titleInput);
    await user.type(titleInput, 'Documentos obrigatorios');

    expect(screen.getByDisplayValue('Documentos obrigatorios')).toBeInTheDocument();
    expect(screen.getByText('Documentos obrigatorios')).toBeInTheDocument();
  });

  it('permite alternar a secao para ate tres colunas sem perder responsividade declarada', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /Adicionar Secao/i }));
    await user.click(screen.getByText('Secao 2'));
    await user.selectOptions(screen.getByLabelText('Colunas da secao no canvas'), '3');

    expect(screen.getByText(/3 coluna\(s\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Colunas da secao no inspetor')).toHaveValue('3');
  });

  it('seleciona o bloco no pointer down mesmo quando o gesto tambem pode iniciar drag', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /Adicionar Selecao/i }));

    const secondCardTitle = screen.getByText('Campo de selecao 2');
    fireEvent.pointerDown(secondCardTitle);

    expect(screen.queryByLabelText('Titulo do formulario')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Campo de selecao 2')).toBeInTheDocument();
  });

  it('sincroniza o destaque visual do canvas com o item aberto no inspetor', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /Adicionar Selecao/i }));
    await user.click(screen.getByText('Campo de selecao 2'));

    const highlightedTitle = screen.getByText('Campo de selecao 2');
    const highlightedCard = highlightedTitle.closest('[data-node-card]') as HTMLElement | null;

    await waitFor(() =>
      expect(highlightedCard?.dataset.visualSelected).toBe('true'),
    );

    const canvasCards = document.querySelectorAll('[data-node-card]');
    expect(Array.from(canvasCards).filter((card) => card.getAttribute('data-visual-selected') === 'true')).toHaveLength(1);
  });

  it('contextualiza o valor esperado com as opcoes do campo controlador select', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /Adicionar Selecao/i }));
    const toggles = screen.getAllByLabelText('Visibilidade condicional ativar');
    await user.click(toggles[0]);

    await user.selectOptions(
      screen.getByLabelText('Visibilidade condicional campo'),
      'campo_de_selecao_2',
    );

    const valueSelect = screen.getByLabelText('Visibilidade condicional valor') as HTMLSelectElement;
    const optionValues = Array.from(valueSelect.options).map((option) => option.value);

    expect(optionValues).toContain('Opcao 1');
    expect(optionValues).toContain('Opcao 2');
  });

  it('habilita operadores numericos quando a regra aponta para campo numero', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /Adicionar Numero/i }));
    const toggles = screen.getAllByLabelText('Visibilidade condicional ativar');
    await user.click(toggles[0]);

    await user.selectOptions(
      screen.getByLabelText('Visibilidade condicional campo'),
      'campo_numerico_2',
    );

    const operatorSelect = screen.getByLabelText('Visibilidade condicional operador') as HTMLSelectElement;
    const operatorLabels = Array.from(operatorSelect.options).map((option) => option.textContent);

    expect(operatorLabels).toContain('Maior que');
    expect(operatorLabels).toContain('Menor ou igual');
  });

  it('mostra e remove icones de condicionais no canvas conforme o estado atual', async () => {
    const user = userEvent.setup();
    renderPage();

    const fieldCardTitle = screen.getByText('Campo de texto 1');
    const fieldCard = fieldCardTitle.closest('[data-node-card]') as HTMLElement;

    expect(screen.queryByLabelText('Campo com visibilidade condicional')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Campo com obrigatoriedade condicional')).not.toBeInTheDocument();

    await user.click(fieldCardTitle);
    await user.click(screen.getByLabelText('Visibilidade condicional ativar'));

    expect(within(fieldCard).getByLabelText('Campo com visibilidade condicional')).toBeInTheDocument();
    await waitFor(() => {
      expect(fieldCard.dataset.visualSelected).toBe('true');
      expect(fieldCard.style.boxShadow).toBe('');
      expect(fieldCard.style.outline).toBe('');
    });

    await user.click(screen.getByLabelText('Visibilidade condicional ativar'));

    expect(within(fieldCard).queryByLabelText('Campo com visibilidade condicional')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(fieldCard.dataset.visualSelected).toBe('true');
      expect(fieldCard.style.boxShadow).toBe('');
      expect(fieldCard.style.outline).toBe('');
    });

    await user.click(screen.getByLabelText('Obrigatorio quando ativar'));

    expect(within(fieldCard).getByLabelText('Campo com obrigatoriedade condicional')).toBeInTheDocument();
    await waitFor(() => {
      expect(fieldCard.dataset.visualSelected).toBe('true');
      expect(fieldCard.style.boxShadow).toBe('');
      expect(fieldCard.style.outline).toBe('');
    });

    await user.click(screen.getByLabelText('Obrigatorio quando ativar'));

    expect(within(fieldCard).queryByLabelText('Campo com obrigatoriedade condicional')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(fieldCard.dataset.visualSelected).toBe('true');
      expect(fieldCard.style.boxShadow).toBe('');
      expect(fieldCard.style.outline).toBe('');
    });
  });

  it('mostra icones de obrigatoriedade fixa e sensibilidade no canvas', async () => {
    const user = userEvent.setup();
    renderPage();

    const fieldCardTitle = screen.getByText('Campo de texto 1');
    const fieldCard = fieldCardTitle.closest('[data-node-card]') as HTMLElement;

    expect(within(fieldCard).queryByLabelText('Campo obrigatorio sempre')).not.toBeInTheDocument();
    expect(within(fieldCard).queryByLabelText('Campo sensivel')).not.toBeInTheDocument();

    await user.click(fieldCardTitle);
    await user.click(screen.getByLabelText('Obrigatorio sempre'));
    await user.click(screen.getByLabelText('Sensivel'));

    expect(within(fieldCard).getByLabelText('Campo obrigatorio sempre')).toBeInTheDocument();
    expect(within(fieldCard).getByLabelText('Campo sensivel')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Obrigatorio sempre'));
    await user.click(screen.getByLabelText('Sensivel'));

    expect(within(fieldCard).queryByLabelText('Campo obrigatorio sempre')).not.toBeInTheDocument();
    expect(within(fieldCard).queryByLabelText('Campo sensivel')).not.toBeInTheDocument();
  });

  it('trata obrigatoriedade fixa e condicional como escolhas exclusivas', async () => {
    const user = userEvent.setup();
    renderPage();

    const fixedRequired = screen.getByLabelText('Obrigatorio sempre') as HTMLInputElement;
    const conditionalRequired = screen.getByLabelText('Obrigatorio quando ativar') as HTMLInputElement;

    await user.click(fixedRequired);
    expect(fixedRequired).toBeChecked();

    await user.click(conditionalRequired);
    expect(conditionalRequired).toBeChecked();
    expect(fixedRequired).not.toBeChecked();

    await user.click(fixedRequired);
    expect(fixedRequired).toBeChecked();
    expect(conditionalRequired).not.toBeChecked();
  });

});

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/formularios/novo']}>
        <Routes>
          <Route path="/formularios/novo" element={<FormBuilderPage />} />
          <Route path="/formularios/:formKey/editar" element={<FormBuilderPage />} />
          <Route path="/formularios" element={<div>Biblioteca</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function mockApiFetch(input: RequestInfo | URL, init?: RequestInit) {
  const url = new URL(String(input));

  if (url.pathname.endsWith('/forms') && init?.method === 'POST') {
    const body = JSON.parse(String(init.body ?? '{}')) as { status?: string };

    return jsonResponse({
      item: {
        key: 'reembolso_builder',
        title: 'Reembolso',
        status: body.status ?? 'ACTIVE',
        updatedAt: '2026-08-30T10:00:00.000Z',
      },
    });
  }

  if (url.pathname.endsWith('/support/catalog/admin')) {
    return jsonResponse({
      departments: [
        {
          id: 'department-1',
          code: 'RH',
          name: 'RH',
          description: null,
          status: 'ACTIVE',
          sortOrder: 1,
          topics: [],
        },
      ],
      teams: [],
      routingRules: [],
    });
  }

  if (url.pathname.endsWith('/forms')) {
    return jsonResponse({ items: [] });
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
