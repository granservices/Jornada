import { useQuery } from '@tanstack/react-query';
import { FileSearch, FileText, Plus, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SearchField } from '../components/ui/search-field';
import { SectionCard } from '../components/ui/section-card';
import { useAuthSession } from '@jornada/frontend-core/auth';
import {
  listDynamicForms,
  type DynamicFormGroup,
} from '../features/forms/forms-api';
import { cn } from '../lib/cn';

const actionClass =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2.5 text-[10px] font-semibold text-[var(--admin-text-primary)] transition hover:bg-[var(--admin-panel-active)]';
const tableGridClass =
  'grid grid-cols-[minmax(220px,1.25fr)_116px_116px_132px_132px_minmax(150px,0.8fr)_112px]';

type FormsSortMode = 'updated_desc' | 'created_desc' | 'title_asc';

type FormsLocationState = {
  updatedFormKey?: string;
  updatedFormTitle?: string;
  updatedFormStatus?: 'ACTIVE' | 'DRAFT' | 'INACTIVE';
  updatedAt?: string;
};

export function FormsPage() {
  const session = useAuthSession();
  const location = useLocation();
  const navigate = useNavigate();
  const [recentUpdate, setRecentUpdate] = useState<FormsLocationState | null>(
    () => (location.state as FormsLocationState | null) ?? null,
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [sortMode, setSortMode] = useState<FormsSortMode>('updated_desc');
  const canConfigure = Boolean(
    session?.user.roles.some((role) => ['ADMIN', 'TI'].includes(role)),
  );

  const formsQuery = useQuery({
    queryKey: ['forms'],
    queryFn: listDynamicForms,
    enabled: canConfigure,
  });

  useEffect(() => {
    const state = location.state as FormsLocationState | null;

    if (!state?.updatedFormKey) {
      return;
    }

    setRecentUpdate(state);
    navigate(location.pathname, { replace: true, state: null });

    const timeout = window.setTimeout(() => {
      setRecentUpdate(null);
    }, 9000);

    return () => window.clearTimeout(timeout);
  }, [location.pathname, location.state, navigate]);

  if (!canConfigure) {
    return (
      <main className="grid w-full gap-2">
        <SectionCard className="p-4">
          <p className="text-[13px] font-semibold text-[var(--admin-text-primary)]">
            Configuracao restrita
          </p>
          <p className="mt-1 text-[12px] text-[var(--admin-text-secondary)]">
            Apenas administradores de TI podem manter formularios.
          </p>
        </SectionCard>
      </main>
    );
  }

  const formGroups = sortFormGroups(
    filterFormGroups(mergeVisibleFormGroups(formsQuery.data?.items ?? []), searchTerm),
    sortMode,
  );
  const recentLabel = recentUpdate
    ? updateFeedbackLabel(recentUpdate)
    : null;

  return (
    <main className="grid h-full min-h-0 w-full grid-rows-[auto_minmax(0,1fr)] gap-2">
      <SectionCard className="flex flex-wrap items-center justify-between gap-2 p-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <FileText size={14} className="text-[var(--admin-text-muted)]" />
          <span className="truncate text-[12px] font-semibold text-[var(--admin-text-primary)]">
            Biblioteca de formularios
          </span>
          {recentLabel ? (
            <span className="hidden rounded-[3px] border border-[var(--admin-accent-border)] bg-[var(--admin-accent-bg)] px-2 py-1 text-[10px] font-semibold text-[var(--admin-accent-text)] sm:inline">
              {recentLabel}
            </span>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1.5">
          <SearchField
            aria-label="Pesquisar formularios"
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Pesquisar formulario"
            appearance="compact"
            className="min-w-[190px] flex-1 sm:max-w-[280px]"
          />
          <label>
            <span className="sr-only">Ordenar formularios</span>
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.currentTarget.value as FormsSortMode)}
              className="h-8 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2 text-[10px] font-semibold text-[var(--admin-text-primary)] outline-none transition focus:border-[#2f6fed]"
            >
              <option value="updated_desc">Atualizados</option>
              <option value="created_desc">Criados</option>
              <option value="title_asc">Nome</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => void formsQuery.refetch()}
            className={actionClass}
          >
            <RefreshCw size={12} />
            Atualizar
          </button>
          <Link to="/formularios/fontes" className={actionClass}>
            <FileSearch size={12} />
            Fontes
          </Link>
          <Link to="/formularios/novo" className={cn(actionClass, 'bg-[var(--admin-panel-active)]')}>
            <Plus size={12} />
            Novo
          </Link>
        </div>
      </SectionCard>

      <SectionCard className="min-h-0 overflow-hidden p-0">
        {formsQuery.isLoading ? (
          <div className="p-3 text-[12px] text-[var(--admin-text-secondary)]">
            Carregando formularios...
          </div>
        ) : null}

        {formsQuery.isError ? (
          <div className="p-3 text-[12px] text-[var(--admin-danger-text)]">
            {formsQuery.error.message}
          </div>
        ) : null}

        {!formsQuery.isLoading && !formsQuery.isError && formGroups.length === 0 ? (
          <div className="p-3 text-[12px] text-[var(--admin-text-secondary)]">
            {searchTerm.trim() ? 'Nenhum formulario encontrado.' : 'Nenhum formulario criado.'}
          </div>
        ) : null}

        {formGroups.length > 0 ? (
          <div className="admin-scrollbar h-full overflow-auto">
            <div className="min-w-[980px]">
              <div className={cn(tableGridClass, 'border-b border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-muted)]')}>
                <span>Formulario</span>
                <span>Publicado</span>
                <span>Em edicao</span>
                <span>Criado</span>
                <span>Atualizado</span>
                <span>Vinculos</span>
                <span className="text-right">Acao</span>
              </div>
              {formGroups.map((group) => (
                <FormRow
                  key={group.key}
                  group={group}
                  recentUpdate={recentUpdate}
                />
              ))}
            </div>
          </div>
        ) : null}
      </SectionCard>
    </main>
  );
}

function FormRow({
  group,
  recentUpdate,
}: {
  group: DynamicFormGroup;
  recentUpdate: FormsLocationState | null;
}) {
  const display = displayForm(group);
  const fieldsCount = display.fields.length;
  const schemaCount = countSchemaFields(display.schema);
  const totalFields = fieldsCount || schemaCount;
  const isRecent = isRecentForm(group, recentUpdate);
  const supportBindings = formSupportBindings(display);

  return (
    <div
      className={cn(
        tableGridClass,
        'items-center border-b border-[var(--admin-border)] px-3 py-2 text-[11.5px] text-[var(--admin-text-secondary)] transition-colors last:border-b-0',
        isRecent ? 'bg-[var(--admin-accent-bg)]' : '',
      )}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate text-[12px] font-semibold text-[var(--admin-text-primary)]">
            {display.title}
          </p>
          {isRecent ? (
            <span className="shrink-0 rounded-[3px] border border-[var(--admin-accent-border)] bg-[var(--admin-accent-bg)] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--admin-accent-text)]">
              recem atualizado
            </span>
          ) : null}
        </div>
        <p className="truncate text-[10px] text-[var(--admin-text-muted)]">
          {group.key} {totalFields ? `• ${totalFields} campos` : ''} • atualizado {formatDateTime(display.updatedAt)}
        </p>
      </div>
      <span>{group.published ? `v${group.published.version}` : 'Nao publicado'}</span>
      <span>
        {group.draft ? (
          <span className="rounded-[3px] border border-[var(--admin-border)] bg-[var(--admin-panel-active)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--admin-text-primary)]">
            rascunho v{group.draft.version}
          </span>
        ) : (
          'Sem rascunho'
        )}
      </span>
      <span className="tabular-nums">{formatDateTime(display.createdAt)}</span>
      <span className="tabular-nums">{formatDateTime(display.updatedAt)}</span>
      <span className="truncate">
        {supportBindings.length
          ? `${supportBindings.length} em atendimento`
          : 'Sem vinculos'}
      </span>
      <div className="flex justify-end">
        <Link
          to={`/formularios/${group.key}/editar`}
          className="inline-flex h-7 w-[112px] items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2 text-[8px] font-semibold leading-none text-[var(--admin-text-secondary)] transition hover:bg-[var(--admin-panel-active)] hover:text-[var(--admin-text-primary)]"
        >
          Editar
        </Link>
      </div>
    </div>
  );
}

function mergeVisibleFormGroups(groups: DynamicFormGroup[]) {
  const grouped = new Map<string, DynamicFormGroup[]>();

  for (const group of groups) {
    const display = displayForm(group);
    const visibleKey = normalizeVisibleKey(display.title || group.key);
    grouped.set(visibleKey, [...(grouped.get(visibleKey) ?? []), group]);
  }

  return Array.from(grouped.values()).map((duplicates) => {
    if (duplicates.length === 1) {
      return duplicates[0];
    }

    return mergeFormGroups(duplicates);
  });
}

function mergeFormGroups(groups: DynamicFormGroup[]): DynamicFormGroup {
  const versions = groups
    .flatMap((group) => formVersions(group).length ? formVersions(group) : [group.latest])
    .sort(compareFormsForDisplay);
  const published = pickBestForm(groups.map((group) => group.published)) ?? null;
  const draft = pickBestForm(groups.map((group) => group.draft)) ?? null;
  const latest = pickBestForm([draft, published, ...groups.map((group) => group.latest)]) ?? groups[0].latest;
  const ownerGroup = groups.find((group) => {
    const candidates = [group.latest, group.published, group.draft].filter(Boolean);
    return candidates.some((form) => form?.id === latest.id);
  });

  return {
    key: ownerGroup?.key ?? groups[0].key,
    latest: {
      ...latest,
      supportBindings: uniqueBindings(groups.flatMap((group) => {
        const display = displayForm(group);
        return display.supportBindings;
      })),
    },
    published,
    draft,
    versions,
  };
}

function pickBestForm<T extends DynamicFormGroup['latest']>(forms: Array<T | null | undefined>) {
  const candidates = forms.filter((form): form is T => Boolean(form));
  return candidates.sort(compareFormsForDisplay)[0];
}

function compareFormsForDisplay(
  left: DynamicFormGroup['latest'],
  right: DynamicFormGroup['latest'],
) {
  const statusDelta = displayStatusScore(right.status) - displayStatusScore(left.status);

  if (statusDelta !== 0) {
    return statusDelta;
  }

  const updatedDelta = timestamp(right.updatedAt) - timestamp(left.updatedAt);

  if (updatedDelta !== 0) {
    return updatedDelta;
  }

  const bindingDelta = formSupportBindings(right).length - formSupportBindings(left).length;

  if (bindingDelta !== 0) {
    return bindingDelta;
  }

  return right.version - left.version;
}

function displayForm(group: DynamicFormGroup) {
  return pickBestForm([group.draft, group.published, group.latest, ...formVersions(group)]) ?? group.latest;
}

function displayStatusScore(status: DynamicFormGroup['latest']['status']) {
  return {
    DRAFT: 100,
    ACTIVE: 90,
    INACTIVE: 0,
  }[status];
}

function filterFormGroups(groups: DynamicFormGroup[], searchTerm: string) {
  const query = normalizeSearch(searchTerm);

  if (!query) {
    return groups;
  }

  return groups.filter((group) => normalizeSearch(searchableGroupText(group)).includes(query));
}

function sortFormGroups(groups: DynamicFormGroup[], sortMode: FormsSortMode) {
  return [...groups].sort((left, right) => {
    const leftDisplay = displayForm(left);
    const rightDisplay = displayForm(right);

    if (sortMode === 'title_asc') {
      return leftDisplay.title.localeCompare(rightDisplay.title, 'pt-BR', {
        sensitivity: 'base',
      });
    }

    if (sortMode === 'created_desc') {
      return timestamp(rightDisplay.createdAt) - timestamp(leftDisplay.createdAt);
    }

    return timestamp(rightDisplay.updatedAt) - timestamp(leftDisplay.updatedAt);
  });
}

function searchableGroupText(group: DynamicFormGroup) {
  const forms = [group.latest, group.published, group.draft, ...formVersions(group)]
    .filter((form): form is DynamicFormGroup['latest'] => Boolean(form));
  const bindings = forms.flatMap((form) =>
    formSupportBindings(form).map((binding) => [
      binding.topic.name,
      binding.topic.code,
      binding.topic.department.name,
      binding.topic.department.code,
    ].join(' ')),
  );

  return [
    group.key,
    ...forms.flatMap((form) => [
      form.key,
      form.title,
      form.description,
      form.status,
      `v${form.version}`,
    ]),
    ...bindings,
  ].filter(Boolean).join(' ');
}

function uniqueBindings(bindings: DynamicFormGroup['latest']['supportBindings']) {
  return Array.from(new Map(bindings.map((binding) => [binding.id, binding])).values());
}

function formSupportBindings(form: DynamicFormGroup['latest']) {
  return Array.isArray(form.supportBindings) ? form.supportBindings : [];
}

function isRecentForm(
  group: DynamicFormGroup,
  recentUpdate: FormsLocationState | null,
) {
  if (!recentUpdate?.updatedFormKey) {
    return false;
  }

  const forms = [group.latest, group.published, group.draft, ...formVersions(group)]
    .filter((form): form is DynamicFormGroup['latest'] => Boolean(form));

  return group.key === recentUpdate.updatedFormKey ||
    forms.some((form) => form.key === recentUpdate.updatedFormKey);
}

function formVersions(group: DynamicFormGroup) {
  return Array.isArray(group.versions) ? group.versions : [];
}

function updateFeedbackLabel(update: FormsLocationState) {
  const action = update.updatedFormStatus === 'ACTIVE' ? 'Publicado' : 'Rascunho salvo';
  const title = update.updatedFormTitle?.trim() || 'Formulario';

  return `${action}: ${title}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'agora';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function timestamp(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function normalizeSearch(value: string) {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizeVisibleKey(value: string) {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function countSchemaFields(schema: Record<string, unknown> | null) {
  const formSchema = schema?.schema;

  if (!isRecord(formSchema)) {
    return 0;
  }

  const properties = formSchema.properties;

  if (!isRecord(properties)) {
    return 0;
  }

  return Object.keys(properties).length;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
