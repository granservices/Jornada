import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  FileText,
  GraduationCap,
  ListFilter,
  Search,
  Stethoscope,
  XCircle,
} from 'lucide-react';
import { ListAction } from '../components/ui/list-action';
import { SectionCard } from '../components/ui/section-card';
import { getAuthSessionSnapshot } from '../features/auth/auth-session';
import { internalContractFixtures } from '../features/contracts/internal-contract-fixtures';
import {
  listMyRequirements,
  listRequirementPreview,
} from '../features/requirements/requirements-api';
import { useAdminWorkerPreview } from '../features/admin-worker-preview/admin-worker-preview-context';
import {
  type ExpirationItem,
  type ExpirationType,
  type RequirementAttention,
  toExpirationItems,
} from '../features/requirements/requirements-view-model';
import { cn } from '../lib/cn';

type ExpirationFilter = 'all' | 'attention' | 'expired' | 'next30' | 'next120' | 'valid' | 'undated' | 'aso' | 'training' | 'documents';

const filterGridClass = 'grid min-w-0 grid-cols-2 gap-1.5 sm:flex sm:flex-wrap';
const filterButtonBaseClass =
  'inline-flex h-8 min-w-0 items-center justify-center gap-1 rounded-[4px] border px-1.5 text-[9.5px] font-semibold leading-none transition sm:w-[116px] sm:flex-none';
const filterButtonActiveClass =
  'border-[var(--admin-border-strong)] bg-[var(--admin-panel-active)] text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)]';
const filterButtonIdleClass =
  'border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-panel-active)] hover:text-[var(--admin-text-primary)]';
const searchFieldClass =
  'flex h-8 min-w-0 items-center gap-2 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2.5 text-[12px] text-[var(--admin-text-secondary)] transition focus-within:border-[var(--admin-border-strong)] focus-within:bg-[var(--admin-panel-active)]';
const filterSelectClass =
  'h-8 min-w-0 flex-1 appearance-none rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2.5 pr-8 text-[11px] font-semibold text-[var(--admin-text-primary)] outline-none transition focus:border-[var(--admin-border-strong)] focus:bg-[var(--admin-panel-active)]';

const expirationTypeMeta: Record<ExpirationType, { label: string; icon: typeof Stethoscope }> = {
  aso: { label: 'ASO', icon: Stethoscope },
  treinamento: { label: 'Treinamento', icon: GraduationCap },
  documento: { label: 'Documento', icon: FileText },
};

const expirationFilterIcons: Record<ExpirationFilter, typeof Search> = {
  all: CalendarClock,
  attention: AlertTriangle,
  expired: XCircle,
  next30: AlertCircle,
  next120: CalendarClock,
  valid: CheckCircle2,
  undated: CircleDashed,
  aso: Stethoscope,
  training: GraduationCap,
  documents: FileText,
};

const attentionMeta: Record<RequirementAttention, { icon: typeof AlertTriangle; className: string; label: string }> = {
  expired: {
    icon: XCircle,
    label: 'Vencido',
    className: 'border-[rgba(196,64,76,0.48)] bg-[rgba(155,31,46,0.2)] text-[#f2b8bf]',
  },
  critical: {
    icon: AlertCircle,
    label: 'Próximo do vencimento',
    className: 'border-[rgba(210,151,64,0.42)] bg-[rgba(180,119,34,0.2)] text-[#f2d3a0]',
  },
  'due-soon': {
    icon: AlertCircle,
    label: 'Próximo do vencimento',
    className: 'border-[rgba(210,151,64,0.42)] bg-[rgba(180,119,34,0.2)] text-[#f2d3a0]',
  },
  upcoming: {
    icon: CalendarClock,
    label: 'Próximo do vencimento',
    className: 'border-[rgba(210,151,64,0.42)] bg-[rgba(180,119,34,0.2)] text-[#f2d3a0]',
  },
  valid: {
    icon: CheckCircle2,
    label: 'Em dia',
    className: 'border-[rgba(74,140,108,0.48)] bg-[rgba(42,101,72,0.22)] text-[#b8e2c8]',
  },
  undated: {
    icon: CircleDashed,
    label: 'Sem data',
    className: 'border-[var(--admin-border)] bg-[var(--admin-surface-3)] text-[var(--admin-text-muted)]',
  },
};

const fixtureExpirationItems: ExpirationItem[] = toExpirationItems(internalContractFixtures.requirementExpirations);

export function ExpirationsPage() {
  const [activeFilter, setActiveFilter] = useState<ExpirationFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const session = getAuthSessionSnapshot();
  const { selectedWorker } = useAdminWorkerPreview();
  const canPreview = session?.user.roles.includes('ADMIN') ?? false;
  const requirementsQuery = useQuery({
    queryKey: ['requirements', selectedWorker?.previewReference ?? 'me'],
    queryFn: () => (selectedWorker ? listRequirementPreview(selectedWorker.previewReference) : listMyRequirements()),
    enabled: Boolean(session) && (!canPreview || Boolean(selectedWorker)),
    staleTime: 60_000,
  });
  const sourceExpirationItems = session
    ? toExpirationItems(requirementsQuery.data?.items ?? [])
    : fixtureExpirationItems;

  const expirationFilters = useMemo(
    () => [
      { id: 'all' as const, label: 'Todos', value: sourceExpirationItems.length },
      { id: 'attention' as const, label: 'Atenção', value: sourceExpirationItems.filter((item) => item.attention.level !== 'valid').length },
      { id: 'expired' as const, label: 'Vencidos', value: sourceExpirationItems.filter((item) => item.attention.level === 'expired').length },
      { id: 'next30' as const, label: 'Até 30d', value: sourceExpirationItems.filter((item) => item.attention.level === 'critical' || item.attention.level === 'due-soon').length },
      { id: 'next120' as const, label: 'Até 120d', value: sourceExpirationItems.filter((item) => item.attention.level === 'upcoming').length },
      { id: 'valid' as const, label: '>120d', value: sourceExpirationItems.filter((item) => item.attention.level === 'valid').length },
      { id: 'undated' as const, label: 'Sem data', value: sourceExpirationItems.filter((item) => item.attention.level === 'undated').length },
      { id: 'aso' as const, label: 'ASO', value: sourceExpirationItems.filter((item) => item.type === 'aso').length },
      { id: 'training' as const, label: 'Treinamentos', value: sourceExpirationItems.filter((item) => item.type === 'treinamento').length },
      { id: 'documents' as const, label: 'Documentos', value: sourceExpirationItems.filter((item) => item.type === 'documento').length },
    ],
    [sourceExpirationItems],
  );

  const visibleItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('pt-BR');

    return sourceExpirationItems
      .filter((item) => {
        const matchesFilter =
          activeFilter === 'all' ||
          (activeFilter === 'attention' && item.attention.level !== 'valid') ||
          (activeFilter === 'expired' && item.attention.level === 'expired') ||
          (activeFilter === 'next30' && (item.attention.level === 'critical' || item.attention.level === 'due-soon')) ||
          (activeFilter === 'next120' && item.attention.level === 'upcoming') ||
          (activeFilter === 'valid' && item.attention.level === 'valid') ||
          (activeFilter === 'undated' && item.attention.level === 'undated') ||
          (activeFilter === 'aso' && item.type === 'aso') ||
          (activeFilter === 'training' && item.type === 'treinamento') ||
          (activeFilter === 'documents' && item.type === 'documento');

        if (!matchesFilter) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        return [item.title, item.owner, item.status, item.dueLabel, item.dueDate, expirationTypeMeta[item.type].label]
          .join(' ')
          .toLocaleLowerCase('pt-BR')
          .includes(normalizedSearch);
      })
      .sort((first, second) => first.dueSortOrder - second.dueSortOrder);
  }, [activeFilter, searchTerm, sourceExpirationItems]);

  const hasFilter = activeFilter !== 'all' || searchTerm.trim().length > 0;
  const activeFilterMeta = expirationFilters.find((filter) => filter.id === activeFilter) ?? expirationFilters[0];
  const emptyTitle = canPreview && !selectedWorker ? 'Selecione um colaborador no topo' : 'Nenhum vencimento encontrado';
  const emptyBody = canPreview && !selectedWorker
    ? 'A seleção administrativa global será usada nesta e nas demais páginas da Jornada.'
    : hasFilter
      ? 'Ajuste o filtro ou a busca para ampliar os resultados.'
      : 'Nao ha necessidades para exibir.';

  return (
    <main className="grid w-full gap-2">
      <section className="rounded-[6px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-2.5 text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)] backdrop-blur-[2px]">
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(220px,280px)] lg:items-center">
          <label className="flex h-8 min-w-0 items-center gap-2 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2 text-[var(--admin-text-secondary)] focus-within:border-[var(--admin-border-strong)] focus-within:bg-[var(--admin-panel-active)] sm:hidden">
            <ListFilter size={14} className="shrink-0 text-[var(--admin-text-muted)]" />
            <select
              aria-label="Filtrar vencimentos"
              value={activeFilter}
              onChange={(event) => setActiveFilter(event.currentTarget.value as ExpirationFilter)}
              className={filterSelectClass}
            >
              {expirationFilters.map((filter) => (
                <option key={filter.id} value={filter.id}>
                  {filter.label} ({filter.value})
                </option>
              ))}
            </select>
            <span className="sr-only">{activeFilterMeta.label}</span>
          </label>
          <div className={cn(filterGridClass, 'hidden sm:flex')}>
            {expirationFilters.map((filter) => {
              const FilterIcon = expirationFilterIcons[filter.id];
              return (
                <button
                  key={filter.id}
                  type="button"
                  aria-pressed={activeFilter === filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={cn(
                    filterButtonBaseClass,
                    activeFilter === filter.id ? filterButtonActiveClass : filterButtonIdleClass,
                  )}
                >
                  <FilterIcon size={13} className="shrink-0" />
                  <span className="truncate">{filter.label}</span>
                  <span className="text-current/70">{filter.value}</span>
                </button>
              );
            })}
          </div>
          <label className={searchFieldClass}>
            <Search size={14} className="shrink-0 text-[var(--admin-text-muted)]" />
            <input
              type="search"
              aria-label="Buscar vencimentos"
              placeholder="Buscar vencimentos"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.currentTarget.value)}
              className="min-w-0 flex-1 bg-transparent text-[12px] text-[var(--admin-text-primary)] outline-none placeholder:text-[var(--admin-text-muted)]"
            />
          </label>
        </div>
        {canPreview && selectedWorker ? (
          <p className="mt-2 truncate border-t border-[var(--admin-border)] pt-2 text-[11px] text-[var(--admin-text-secondary)]">
            Validação global: {selectedWorker.fullName}
            {selectedWorker.employeeNumber ? ` - ${selectedWorker.employeeNumber}` : ''}
          </p>
        ) : null}
      </section>

      <SectionCard className="overflow-hidden rounded-[6px] border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-0 text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)] backdrop-blur-[2px]">
        <div
          className="hidden min-h-8 grid-cols-[minmax(220px,1.65fr)_minmax(124px,0.72fr)_minmax(112px,0.58fr)_112px] items-center gap-2 border-b border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-muted)] lg:grid"
          aria-hidden="true"
        >
          <span>Item</span>
          <span>Vencimento</span>
          <span>Situação</span>
          <span className="text-center">Acao</span>
        </div>
        <div className="divide-y divide-[var(--admin-border)]" role="list" aria-label="Lista de vencimentos">
          {requirementsQuery.isLoading ? <ModuleEmptyState title="Carregando vencimentos" body="Consultando necessidades do colaborador." /> : null}
          {requirementsQuery.isError ? <ModuleEmptyState title="Nao foi possivel carregar vencimentos" body={requirementsQuery.error.message} /> : null}
          {!requirementsQuery.isLoading && !requirementsQuery.isError && visibleItems.length > 0 ? visibleItems.map((item) => (
            <ExpirationRecord key={item.id} item={item} />
          )) : null}
          {!requirementsQuery.isLoading && !requirementsQuery.isError && visibleItems.length === 0 ? <ModuleEmptyState title={emptyTitle} body={emptyBody} /> : null}
        </div>
      </SectionCard>
    </main>
  );
}

function ModuleEmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="px-3 py-6 text-center sm:px-3.5">
      <p className="text-[13px] font-semibold text-[var(--admin-text-primary)]">{title}</p>
      <p className="mt-1 text-[12px] text-[var(--admin-text-secondary)]">{body}</p>
    </div>
  );
}

function ExpirationRecord({ item }: { item: ExpirationItem }) {
  const meta = expirationTypeMeta[item.type];
  const Icon = meta.icon;
  const action = expirationActionForSupport(item);

  return (
    <article
      className="grid min-h-[64px] grid-cols-1 gap-2 px-2.5 py-2 sm:px-3 lg:min-h-[52px] lg:grid-cols-[minmax(220px,1.65fr)_minmax(124px,0.72fr)_minmax(112px,0.58fr)_112px] lg:items-center lg:gap-2 lg:py-1.5"
      role="listitem"
    >
      <div className="flex min-w-0 items-start gap-2 lg:items-center">
        <span className="mt-0.5 flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)] lg:mt-0">
          <Icon size={14} />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-[12.5px] font-semibold text-[var(--admin-text-primary)]">{item.title}</h3>
          <p className="mt-0.5 truncate text-[10.5px] text-[var(--admin-text-muted)]">{meta.label}</p>
        </div>
      </div>

      <div className="min-w-0 pl-9 sm:pl-0 lg:block">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-muted)] lg:hidden">
            Vence
          </p>
          <p className="truncate text-[11.5px] font-semibold text-[var(--admin-text-primary)] lg:text-[11px]">{item.dueDate}</p>
          <p className="truncate text-[10.5px] text-[var(--admin-text-muted)]">{item.dueLabel}</p>
        </div>
      </div>

      <div className="min-w-0 pl-9 sm:pl-0">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-muted)] lg:hidden">
          Situação
        </p>
        <AttentionIndicator item={item} />
      </div>

      <ListAction
        label={action.label}
        to={action.to}
        className="col-span-1"
      />
    </article>
  );
}

function expirationActionForSupport(item: ExpirationItem) {
  if (item.type === 'aso') {
    return {
      label: 'Medicina',
      to: '/atendimento?modo=new&setor=MEDICINE&assunto=ASO',
    };
  }

  if (item.type === 'treinamento') {
    return {
      label: 'Treinamento',
      to: '/atendimento?modo=new&setor=TRAINING&assunto=CERTIFICATE',
    };
  }

  return { label: item.action, to: undefined };
}

function AttentionIndicator({ item }: { item: ExpirationItem }) {
  const meta = attentionMeta[item.attention.level];
  const Icon = meta.icon;

  return (
    <span
      className={cn(
        'inline-flex h-6 min-w-[76px] items-center justify-center gap-1 rounded-[4px] border px-1.5 text-[9.5px] font-semibold leading-none',
        meta.className,
      )}
      title={meta.label}
      aria-label={`Situação: ${meta.label}`}
    >
      <Icon size={12} className="shrink-0" />
      <span className="truncate">{meta.label}</span>
    </span>
  );
}
