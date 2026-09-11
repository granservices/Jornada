import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileSearch, Plus, RefreshCw, Save, Search, TestTube2 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SearchField } from '../components/ui/search-field';
import { SectionCard } from '../components/ui/section-card';
import { useAuthSession } from '@jornada/frontend-core/auth';
import {
  createOptionSource,
  getOptionSource,
  listOptionSources,
  previewOptionSource,
  updateOptionSource,
  type OptionSourceAdapterType,
  type OptionSourceDetail,
  type OptionSourceSummary,
} from '../features/forms/forms-api';
import { cn } from '../lib/cn';

const actionClass =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2.5 text-[10px] font-semibold text-[var(--admin-text-primary)] transition hover:bg-[var(--admin-panel-active)] disabled:opacity-60';
const primaryActionClass =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded-[4px] border border-[var(--admin-border-strong)] bg-[var(--admin-panel-active)] px-2.5 text-[10px] font-semibold text-[var(--admin-text-primary)] transition hover:bg-[var(--admin-surface-2)] disabled:opacity-60';
const inputClass =
  'h-8 w-full rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2.5 text-[11px] text-[var(--admin-text-primary)] outline-none transition placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-border-strong)]';
const textareaClass =
  'min-h-24 w-full rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2.5 py-2 text-[11px] leading-5 text-[var(--admin-text-primary)] outline-none transition placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-border-strong)]';
const tableGridClass =
  'grid grid-cols-[minmax(240px,1.4fr)_100px_92px_96px_120px_92px]';

type SourceStatus = 'ACTIVE' | 'INACTIVE';
type EditorMode = 'create' | 'edit';

type SourceDraft = {
  key: string;
  name: string;
  adapterType: OptionSourceAdapterType;
  status: SourceStatus;
  cacheTtlSeconds: string;
  endpoint: string;
  itemsPath: string;
  valuePath: string;
  labelPath: string;
  queryParam: string;
  staticOptionsText: string;
};

const defaultDraft = (): SourceDraft => ({
  key: '',
  name: '',
  adapterType: 'HTTP_JSON',
  status: 'ACTIVE',
  cacheTtlSeconds: '300',
  endpoint: '',
  itemsPath: 'items',
  valuePath: 'value',
  labelPath: 'label',
  queryParam: 'q',
  staticOptionsText: '1 | Opcao 1\n2 | Opcao 2',
});

export function OptionSourcesPage() {
  const session = useAuthSession();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<EditorMode>('edit');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [draft, setDraft] = useState<SourceDraft>(() => defaultDraft());
  const [previewQuery, setPreviewQuery] = useState('');
  const canConfigure = Boolean(
    session?.user.roles.some((role) => ['ADMIN', 'TI'].includes(role)),
  );

  const sourcesQuery = useQuery({
    queryKey: ['forms', 'option-sources', 'admin'],
    queryFn: () => listOptionSources({ includeInactive: true }),
    enabled: canConfigure,
  });

  const detailQuery = useQuery({
    queryKey: ['forms', 'option-sources', 'admin', selectedKey],
    queryFn: () => getOptionSource(selectedKey as string),
    enabled: canConfigure && Boolean(selectedKey),
  });

  const previewMutation = useMutation({
    mutationFn: previewOptionSource,
  });

  const saveCreateMutation = useMutation({
    mutationFn: createOptionSource,
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ['forms', 'option-sources'] });
      setMode('edit');
      setSelectedKey(response.item.key);
    },
  });

  const saveUpdateMutation = useMutation({
    mutationFn: ({ sourceKey, payload }: { sourceKey: string; payload: ReturnType<typeof buildPayload> }) =>
      updateOptionSource(sourceKey, payload),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ['forms', 'option-sources'] });
      setSelectedKey(response.item.key);
    },
  });

  useEffect(() => {
    if (mode !== 'edit' || !detailQuery.data?.item) {
      return;
    }

    setDraft(mapDetailToDraft(detailQuery.data.item));
  }, [detailQuery.data, mode]);

  useEffect(() => {
    if (mode === 'create' || selectedKey || !sourcesQuery.data?.items.length) {
      return;
    }

    const firstSource = sourcesQuery.data.items[0] as OptionSourceSummary;
    setSelectedKey(firstSource.key);
  }, [mode, selectedKey, sourcesQuery.data]);

  if (!canConfigure) {
    return (
      <main className="grid w-full gap-2">
        <SectionCard className="p-4">
          <p className="text-[13px] font-semibold text-[var(--admin-text-primary)]">
            Configuracao restrita
          </p>
          <p className="mt-1 text-[12px] text-[var(--admin-text-secondary)]">
            Apenas administradores de TI podem manter fontes de opcoes.
          </p>
        </SectionCard>
      </main>
    );
  }

  const filteredSources = filterSources(
    (sourcesQuery.data?.items as OptionSourceSummary[] | undefined) ?? [],
    searchTerm,
  );
  const saveError = saveCreateMutation.error?.message ?? saveUpdateMutation.error?.message ?? null;
  const previewError = previewMutation.error?.message ?? null;
  const previewItems = previewMutation.data?.items ?? [];
  const isSaving = saveCreateMutation.isPending || saveUpdateMutation.isPending;

  return (
    <main className="grid h-full min-h-0 w-full grid-rows-[auto_minmax(0,1fr)] gap-2">
      <SectionCard className="flex flex-wrap items-center justify-between gap-2 p-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <FileSearch size={14} className="text-[var(--admin-text-muted)]" />
          <span className="truncate text-[12px] font-semibold text-[var(--admin-text-primary)]">
            Fontes de opcoes
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1.5">
          <SearchField
            aria-label="Pesquisar fontes"
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Pesquisar fonte"
            appearance="compact"
            className="min-w-[190px] flex-1 sm:max-w-[260px]"
          />
          <button
            type="button"
            onClick={() => void sourcesQuery.refetch()}
            className={actionClass}
          >
            <RefreshCw size={12} />
            Atualizar
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('create');
              setSelectedKey(null);
              setDraft(defaultDraft());
              previewMutation.reset();
            }}
            className={primaryActionClass}
          >
            <Plus size={12} />
            Nova fonte
          </button>
          <Link to="/formularios" className={actionClass}>
            Voltar
          </Link>
        </div>
      </SectionCard>

      <div className="grid min-h-0 gap-2 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <SectionCard className="min-h-0 overflow-hidden p-0">
          {sourcesQuery.isLoading ? (
            <div className="p-3 text-[12px] text-[var(--admin-text-secondary)]">
              Carregando fontes...
            </div>
          ) : null}

          {sourcesQuery.isError ? (
            <div className="p-3 text-[12px] text-[var(--admin-danger-text)]">
              {sourcesQuery.error.message}
            </div>
          ) : null}

          {!sourcesQuery.isLoading && !sourcesQuery.isError && filteredSources.length === 0 ? (
            <div className="p-3 text-[12px] text-[var(--admin-text-secondary)]">
              {searchTerm.trim() ? 'Nenhuma fonte encontrada.' : 'Nenhuma fonte cadastrada.'}
            </div>
          ) : null}

          {filteredSources.length > 0 ? (
            <div className="admin-scrollbar h-full overflow-auto">
              <div className="min-w-[860px]">
                <div className={cn(tableGridClass, 'border-b border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-muted)]')}>
                  <span>Fonte</span>
                  <span>Tipo</span>
                  <span>Status</span>
                  <span>Cache</span>
                  <span>Atualizado</span>
                  <span className="text-right">Acao</span>
                </div>
                {filteredSources.map((source) => (
                  <button
                    key={source.id}
                    type="button"
                    onClick={() => {
                      setMode('edit');
                      setSelectedKey(source.key);
                      previewMutation.reset();
                    }}
                    className={cn(
                      tableGridClass,
                      'w-full items-center border-b border-[var(--admin-border)] px-3 py-2 text-left text-[11px] text-[var(--admin-text-secondary)] transition last:border-b-0 hover:bg-[var(--admin-surface-2)]',
                      selectedKey === source.key ? 'bg-[var(--admin-panel-active)]' : '',
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-semibold text-[var(--admin-text-primary)]">
                        {source.name}
                      </p>
                      <p className="truncate text-[10px] text-[var(--admin-text-muted)]">
                        {source.key}
                      </p>
                    </div>
                    <span>{source.adapterType === 'HTTP_JSON' ? 'HTTP' : 'Estatica'}</span>
                    <span>{source.status === 'ACTIVE' ? 'Ativa' : 'Inativa'}</span>
                    <span>{source.cacheTtlSeconds}s</span>
                    <span className="tabular-nums">{formatDateTime(source.updatedAt)}</span>
                    <span className="text-right text-[10px] font-semibold text-[var(--admin-text-primary)]">
                      Editar
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </SectionCard>

        <div className="grid min-h-0 gap-2">
          <SectionCard className="admin-scrollbar min-h-0 overflow-auto p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[12px] font-semibold text-[var(--admin-text-primary)]">
                  {mode === 'create' ? 'Nova fonte' : 'Editar fonte'}
                </p>
                <p className="mt-1 text-[11px] text-[var(--admin-text-secondary)]">
                  Endpoint e mapeamento ficam protegidos no backend. O formulario recebe apenas a chave.
                </p>
              </div>
              <div className="rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2 py-1 text-[10px] font-semibold text-[var(--admin-text-secondary)]">
                {draft.adapterType === 'HTTP_JSON' ? 'HTTP JSON' : 'Lista estatica'}
              </div>
            </div>

            <div className="mt-3 grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nome">
                  <input
                    value={draft.name}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setDraft((current) => ({ ...current, name: value }));
                    }}
                    className={inputClass}
                    placeholder="Ex.: Centros de custo"
                  />
                </Field>
                <Field label="Chave">
                  <input
                    value={draft.key}
                    readOnly={mode === 'edit'}
                    onChange={(event) => {
                      const value = normalizeKey(event.currentTarget.value);
                      setDraft((current) => ({ ...current, key: value }));
                    }}
                    className={cn(inputClass, mode === 'edit' ? 'opacity-70' : '')}
                    placeholder="centros_de_custo"
                  />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Tipo">
                  <select
                    value={draft.adapterType}
                    onChange={(event) => {
                      const value = event.currentTarget.value as OptionSourceAdapterType;
                      setDraft((current) => ({
                        ...current,
                        adapterType: value,
                      }));
                    }}
                    className={inputClass}
                  >
                    <option value="HTTP_JSON">HTTP JSON</option>
                    <option value="STATIC">Estatica</option>
                  </select>
                </Field>
                <Field label="Status">
                  <select
                    value={draft.status}
                    onChange={(event) => {
                      const value = event.currentTarget.value as SourceStatus;
                      setDraft((current) => ({
                        ...current,
                        status: value,
                      }));
                    }}
                    className={inputClass}
                  >
                    <option value="ACTIVE">Ativa</option>
                    <option value="INACTIVE">Inativa</option>
                  </select>
                </Field>
                <Field label="Cache TTL (s)">
                  <input
                    value={draft.cacheTtlSeconds}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setDraft((current) => ({ ...current, cacheTtlSeconds: value }));
                    }}
                    className={inputClass}
                    inputMode="numeric"
                    placeholder="300"
                  />
                </Field>
              </div>

              {draft.adapterType === 'HTTP_JSON' ? (
                <div className="grid gap-3">
                  <Field label="Endpoint">
                    <input
                      value={draft.endpoint}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setDraft((current) => ({ ...current, endpoint: value }));
                      }}
                      className={inputClass}
                      placeholder="https://api.exemplo.com/itens"
                    />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Lista em">
                      <input
                        value={draft.itemsPath}
                        onChange={(event) => {
                          const value = event.currentTarget.value;
                          setDraft((current) => ({ ...current, itemsPath: value }));
                        }}
                        className={inputClass}
                        placeholder="items"
                      />
                    </Field>
                    <Field label="Parametro de busca">
                      <input
                        value={draft.queryParam}
                        onChange={(event) => {
                          const value = event.currentTarget.value;
                          setDraft((current) => ({ ...current, queryParam: value }));
                        }}
                        className={inputClass}
                        placeholder="q"
                      />
                    </Field>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Valor em">
                      <input
                        value={draft.valuePath}
                        onChange={(event) => {
                          const value = event.currentTarget.value;
                          setDraft((current) => ({ ...current, valuePath: value }));
                        }}
                        className={inputClass}
                        placeholder="id"
                      />
                    </Field>
                    <Field label="Rotulo em">
                      <input
                        value={draft.labelPath}
                        onChange={(event) => {
                          const value = event.currentTarget.value;
                          setDraft((current) => ({ ...current, labelPath: value }));
                        }}
                        className={inputClass}
                        placeholder="name"
                      />
                    </Field>
                  </div>
                </div>
              ) : (
                <Field label="Opcoes manuais">
                  <textarea
                    value={draft.staticOptionsText}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setDraft((current) => ({ ...current, staticOptionsText: value }));
                    }}
                    className={textareaClass}
                    placeholder={'1 | Administrativo\n2 | Operacional'}
                  />
                </Field>
              )}

              {saveError ? (
                <p className="text-[11px] text-[var(--admin-danger-text)]">{saveError}</p>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const payload = buildPayload(draft);

                    if (mode === 'create') {
                      saveCreateMutation.mutate({
                        key: draft.key.trim(),
                        ...payload,
                      });
                      return;
                    }

                    if (!selectedKey) {
                      return;
                    }

                    saveUpdateMutation.mutate({
                      sourceKey: selectedKey,
                      payload,
                    });
                  }}
                  disabled={isSaving}
                  className={primaryActionClass}
                >
                  <Save size={12} />
                  {mode === 'create' ? 'Salvar fonte' : 'Salvar alteracoes'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    previewMutation.mutate({
                      adapterType: draft.adapterType,
                      config: buildConfig(draft),
                      query: previewQuery.trim() || undefined,
                      limit: 20,
                    })
                  }
                  disabled={previewMutation.isPending}
                  className={actionClass}
                >
                  <TestTube2 size={12} />
                  Testar
                </button>
              </div>
            </div>
          </SectionCard>

          <SectionCard className="min-h-0 overflow-hidden p-0">
            <div className="flex items-center justify-between gap-2 border-b border-[var(--admin-border)] px-3 py-2">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-[var(--admin-text-primary)]">
                  Preview normalizado
                </p>
                <p className="mt-1 text-[10px] text-[var(--admin-text-secondary)]">
                  Valida busca, estrutura e mapeamento antes do uso no formulario.
                </p>
              </div>
              <label className="flex min-w-[170px] items-center gap-2 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2.5">
                <Search size={12} className="text-[var(--admin-text-muted)]" />
                <input
                  aria-label="Buscar preview da fonte"
                  value={previewQuery}
                  onChange={(event) => setPreviewQuery(event.currentTarget.value)}
                  className="h-8 min-w-0 flex-1 bg-transparent text-[11px] text-[var(--admin-text-primary)] outline-none placeholder:text-[var(--admin-text-muted)]"
                  placeholder="Filtrar preview"
                />
              </label>
            </div>
            <div className="admin-scrollbar max-h-[300px] overflow-auto p-3">
              {previewMutation.isPending ? (
                <p className="text-[12px] text-[var(--admin-text-secondary)]">Consultando fonte...</p>
              ) : null}
              {previewError ? (
                <p className="text-[12px] text-[var(--admin-danger-text)]">{previewError}</p>
              ) : null}
              {!previewMutation.isPending && !previewError && previewItems.length === 0 ? (
                <div className="rounded-[5px] border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-4 text-[12px] text-[var(--admin-text-secondary)]">
                  Use Testar para ver o retorno normalizado.
                </div>
              ) : null}
              {previewItems.length > 0 ? (
                <div className="grid gap-1.5">
                  {previewItems.map((item) => (
                    <div
                      key={`${item.value}-${item.label}`}
                      className="rounded-[5px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-2"
                    >
                      <p className="truncate text-[11.5px] font-semibold text-[var(--admin-text-primary)]">
                        {item.label}
                      </p>
                      <p className="truncate text-[10px] text-[var(--admin-text-muted)]">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function filterSources(items: OptionSourceSummary[], searchTerm: string) {
  const query = normalizeSearch(searchTerm);

  if (!query) {
    return items;
  }

  return items.filter((item) =>
    normalizeSearch(`${item.name} ${item.key} ${item.adapterType} ${item.status}`).includes(query),
  );
}

function normalizeSearch(value: string) {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizeKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'agora';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function buildPayload(draft: SourceDraft) {
  return {
    name: draft.name.trim(),
    adapterType: draft.adapterType,
    status: draft.status,
    cacheTtlSeconds: Number.parseInt(draft.cacheTtlSeconds, 10) || 300,
    config: buildConfig(draft),
  };
}

function buildConfig(draft: SourceDraft) {
  if (draft.adapterType === 'STATIC') {
    return {
      options: parseStaticOptions(draft.staticOptionsText),
    };
  }

  return {
    endpoint: draft.endpoint.trim(),
    itemsPath: draft.itemsPath.trim() || 'items',
    valuePath: draft.valuePath.trim() || 'value',
    labelPath: draft.labelPath.trim() || 'label',
    queryParam: draft.queryParam.trim() || 'q',
  };
}

function parseStaticOptions(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [rawValue, rawLabel] = line.split('|').map((part) => part.trim());
      return {
        value: rawValue || line,
        label: rawLabel || rawValue || line,
      };
    });
}

function mapDetailToDraft(source: OptionSourceDetail): SourceDraft {
  const config = source.config ?? {};

  return {
    key: source.key,
    name: source.name,
    adapterType: source.adapterType,
    status: source.status,
    cacheTtlSeconds: String(source.cacheTtlSeconds),
    endpoint: stringConfig(config.endpoint),
    itemsPath: stringConfig(config.itemsPath) || 'items',
    valuePath: stringConfig(config.valuePath) || 'value',
    labelPath: stringConfig(config.labelPath) || 'label',
    queryParam: stringConfig(config.queryParam) || 'q',
    staticOptionsText: Array.isArray(config.options)
      ? config.options
          .flatMap((item) =>
            item && typeof item === 'object' && !Array.isArray(item)
              ? [`${stringConfig((item as Record<string, unknown>).value)} | ${stringConfig((item as Record<string, unknown>).label)}`.trim()]
              : [],
          )
          .join('\n')
      : '',
  };
}

function stringConfig(value: unknown) {
  return typeof value === 'string' ? value : '';
}
