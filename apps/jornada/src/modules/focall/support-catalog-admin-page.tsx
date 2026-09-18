import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardCheck,
  ClipboardList,
  GitBranch,
  Plus,
  Search,
  Settings2,
  UsersRound,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { SectionCard } from '../../components/ui/section-card';
import { StatusPill } from '../../components/ui/status-pill';
import { useAuthSession } from '../../features/auth/use-auth-session';
import {
  createSupportTopicForm,
  deleteSupportDepartment,
  deleteSupportRoutingRule,
  deleteSupportTeam,
  deleteSupportTeamMember,
  deleteSupportTopic,
  listSupportAssignableUsers,
  listSupportCatalogAdmin,
  updateSupportDepartment,
  updateSupportRoutingRule,
  updateSupportTeam,
  updateSupportTopic,
  upsertSupportDepartment,
  upsertSupportRoutingRule,
  upsertSupportTeam,
  upsertSupportTeamMember,
  upsertSupportTopic,
  type SupportCaseOpeningPolicy,
  type SupportCasePriority,
  type SupportFormFieldType,
} from './support-api';
import { cn } from '../../lib/cn';

type AdminPage = 'hub' | 'departments' | 'topics' | 'teams' | 'routing' | 'approvals' | 'forms';
type CatalogStatus = 'ACTIVE' | 'INACTIVE';
type CatalogAdminData = Awaited<ReturnType<typeof listSupportCatalogAdmin>>;
type CatalogAdminDepartment = CatalogAdminData['departments'][number];
type CatalogAdminTeam = CatalogAdminData['teams'][number];
type CatalogAdminRoutingRule = CatalogAdminData['routingRules'][number];
type CatalogAdminTopic = CatalogAdminDepartment['topics'][number] & {
  department: CatalogAdminDepartment;
};

type DraftField = {
  code: string;
  label: string;
  type: SupportFormFieldType;
  required: boolean;
  sensitive: boolean;
  helpText: string;
  optionsText: string;
  visibleWhen: FieldConditionDraft;
  requiredWhen: FieldConditionDraft;
};

type RoutingConditionOperator = 'equals' | 'notEquals' | 'in' | 'contains' | 'exists';
type RoutingConditionMode = 'all' | 'any';
type RoutingConditionDraft = {
  id: string;
  fieldCode: string;
  operator: RoutingConditionOperator;
  value: string;
};
type FieldConditionDraft = {
  sourceCode: string;
  operator: RoutingConditionOperator;
  value: string;
};

const configPages: Array<{
  id: Exclude<AdminPage, 'hub'>;
  label: string;
  description: string;
  to: string;
  icon: typeof Settings2;
}> = [
  {
    id: 'departments',
    label: 'Setores',
    description: 'Areas visiveis para o funcionario',
    to: '/atendimentos/configuracao/setores',
    icon: ClipboardList,
  },
  {
    id: 'topics',
    label: 'Assuntos',
    description: 'Motivos selecionaveis por setor',
    to: '/atendimentos/configuracao/assuntos',
    icon: Settings2,
  },
  {
    id: 'teams',
    label: 'Equipes',
    description: 'Filas internas e atendentes',
    to: '/atendimentos/configuracao/equipes',
    icon: UsersRound,
  },
  {
    id: 'routing',
    label: 'Regras',
    description: 'Roteamento para filas internas',
    to: '/atendimentos/configuracao/regras',
    icon: GitBranch,
  },
  {
    id: 'approvals',
    label: 'Aprovações',
    description: 'Fluxos e equipes aprovadoras',
    to: '/atendimentos/configuracao/aprovacoes',
    icon: ClipboardCheck,
  },
];

const fieldTypes: SupportFormFieldType[] = [
  'TEXT',
  'TEXTAREA',
  'SELECT',
  'DATE',
  'BOOLEAN',
  'NUMBER',
  'FILE',
];

const openingPolicyLabel: Record<SupportCaseOpeningPolicy, string> = {
  CONTINUOUS_CONVERSATION: 'conversa continua',
  INDIVIDUAL_REQUEST: 'solicitacao individual',
  BUSINESS_KEY: 'chave de negocio',
};

const compactInput =
  'h-8 min-w-0 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2 text-[12px] text-[var(--admin-text-primary)] outline-none placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-border-strong)]';
const compactTextarea =
  'min-h-16 resize-none rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2 py-1.5 text-[12px] leading-5 text-[var(--admin-text-primary)] outline-none placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-border-strong)]';
const compactButton =
  'inline-flex h-8 items-center justify-center gap-1 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2 text-[10.5px] font-semibold text-[var(--admin-text-primary)] transition hover:bg-[var(--admin-panel-active)] disabled:opacity-50';
const dangerButton =
  'inline-flex h-7 w-full items-center justify-center rounded-[4px] border border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.10)] px-1.5 text-[9.5px] font-semibold text-[rgba(255,210,210,0.95)] transition hover:bg-[rgba(239,68,68,0.18)] disabled:opacity-50 sm:w-[58px]';
const ghostButton =
  'inline-flex h-7 w-full items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-1.5 text-[9.5px] font-semibold text-[var(--admin-text-secondary)] transition hover:bg-[var(--admin-panel-active)] hover:text-[var(--admin-text-primary)] disabled:opacity-50 sm:w-[58px]';
const adminRowClass =
  'grid gap-2 px-3 py-2 text-left transition hover:bg-[var(--admin-surface-2)] sm:min-h-[52px] sm:items-center';
const adminActionCellClass =
  'grid grid-cols-3 gap-1 sm:flex sm:w-[184px] sm:shrink-0 sm:items-center sm:justify-end';
const primaryButton =
  'inline-flex h-8 items-center justify-center gap-1 rounded-[4px] border border-[var(--admin-border-strong)] bg-[var(--admin-panel-active)] px-2.5 text-[10.5px] font-semibold text-[var(--admin-text-primary)] transition hover:bg-[var(--admin-surface-2)] disabled:opacity-50';
const conditionButton =
  'inline-flex h-7 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2 text-[9.5px] font-semibold text-[var(--admin-text-secondary)] transition hover:bg-[var(--admin-panel-active)] hover:text-[var(--admin-text-primary)] disabled:opacity-50';
const labelClass =
  'text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-text-muted)]';

export function SupportCatalogAdminPage() {
  return <SupportCatalogAdminSurface page="hub" />;
}

export function SupportDepartmentsAdminPage() {
  return <SupportCatalogAdminSurface page="departments" />;
}

export function SupportTopicsAdminPage() {
  return <SupportCatalogAdminSurface page="topics" />;
}

export function SupportTeamsAdminPage() {
  return <SupportCatalogAdminSurface page="teams" />;
}

export function SupportRoutingRulesAdminPage() {
  return <SupportCatalogAdminSurface page="routing" />;
}

export function SupportFormsAdminPage() {
  return <SupportCatalogAdminSurface page="forms" />;
}

function SupportCatalogAdminSurface({ page }: { page: AdminPage }) {
  const session = useAuthSession();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const canConfigure = Boolean(
    session?.user.roles.some((role) => ['ADMIN', 'SUPPORT'].includes(role)),
  );
  const canManageDepartments = Boolean(session?.user.roles.includes('ADMIN'));

  const catalogQuery = useQuery({
    queryKey: ['support', 'catalog', 'admin'],
    queryFn: listSupportCatalogAdmin,
    enabled: canConfigure,
  });
  const usersQuery = useQuery({
    queryKey: ['support', 'catalog', 'assignees'],
    queryFn: listSupportAssignableUsers,
    enabled: canConfigure,
  });
  const catalog = catalogQuery.data;
  const departments = catalog?.departments ?? [];
  const teams = catalog?.teams ?? [];
  const routingRules = catalog?.routingRules ?? [];
  const topics: CatalogAdminTopic[] = departments.flatMap((department) =>
    department.topics.map((topic) => ({
      ...topic,
      department,
    })),
  );
  const selectedDepartment = departments.find(
    (department) => department.id === selectedDepartmentId,
  );
  const selectedTopic = topics.find((topic) => topic.id === selectedTopicId);
  const filteredDepartments = useMemo(() => {
    const query = normalizeSearch(searchTerm);

    if (!query) {
      return departments;
    }

    return departments.filter((department) =>
      [department.code, department.name, department.description ?? '']
        .some((value) => normalizeSearch(value).includes(query)),
    );
  }, [departments, searchTerm]);
  const filteredTopics = useMemo(() => {
    const query = normalizeSearch(searchTerm);

    if (!query) {
      return topics;
    }

    return topics.filter((topic) =>
      [topic.code, topic.name, topic.description ?? '', topic.department.name].some(
        (value) => normalizeSearch(value).includes(query),
      ),
    );
  }, [topics, searchTerm]);
  const filteredTeams = useMemo(() => {
    const query = normalizeSearch(searchTerm);

    if (!query) {
      return teams;
    }

    return teams.filter((team) =>
      [team.code, team.name, team.department?.name ?? ''].some((value) =>
        normalizeSearch(value).includes(query),
      ),
    );
  }, [teams, searchTerm]);
  const filteredRoutingRules = useMemo(() => {
    const query = normalizeSearch(searchTerm);

    if (!query) {
      return routingRules;
    }

    return routingRules.filter((rule) =>
      [
        rule.department.name,
        rule.topic?.name ?? '',
        rule.team.name,
      ].some((value) => normalizeSearch(value).includes(query)),
    );
  }, [routingRules, searchTerm]);

  useEffect(() => {
    if (selectedDepartmentId || departments.length === 0) {
      return;
    }

    setSelectedDepartmentId(departments[0].id);
  }, [departments, selectedDepartmentId]);

  useEffect(() => {
    if (selectedTopicId || topics.length === 0) {
      return;
    }

    setSelectedTopicId(topics[0].id);
  }, [selectedTopicId, topics]);

  const refreshCatalog = () => {
    void queryClient.invalidateQueries({ queryKey: ['support', 'catalog'] });
    void queryClient.invalidateQueries({ queryKey: ['support', 'catalog', 'admin'] });
    void queryClient.invalidateQueries({ queryKey: ['support', 'teams'] });
    void queryClient.invalidateQueries({ queryKey: ['support', 'catalog', 'assignees'] });
  };

  const retryCatalog = () => {
    void catalogQuery.refetch();
    void usersQuery.refetch();
  };

  if (!session) {
    return (
      <main className="grid w-full gap-2">
        <SectionCard className="rounded-[6px] border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-4 text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)] backdrop-blur-[2px]">
          <p className="text-[13px] font-semibold">Sessao encerrada</p>
          <p className="mt-1 text-[12px] text-[var(--admin-text-secondary)]">
            Entre novamente para carregar as configuracoes de atendimento.
          </p>
          <NavLink
            to="/login"
            className="mt-3 inline-flex h-8 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2.5 text-[10.5px] font-semibold text-[var(--admin-text-primary)] transition hover:bg-[var(--admin-panel-active)]"
          >
            Ir para login
          </NavLink>
        </SectionCard>
      </main>
    );
  }

  if (!canConfigure) {
    return (
      <main className="grid w-full gap-2">
        <SectionCard className="rounded-[6px] border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-4 text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)] backdrop-blur-[2px]">
          <p className="text-[13px] font-semibold">Configuracao restrita</p>
          <p className="mt-1 text-[12px] text-[var(--admin-text-secondary)]">
            Apenas administradores e responsaveis pelo suporte podem manter o catalogo.
          </p>
        </SectionCard>
      </main>
    );
  }

  return (
    <main className="grid w-full gap-2">
      <ConfigToolbar
        page={page}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
      />

      {catalogQuery.isError ? (
        <CatalogLoadError
          message={catalogQuery.error.message}
          onRetry={retryCatalog}
          retrying={catalogQuery.isFetching}
        />
      ) : null}

      {catalogQuery.isLoading ? (
        <SectionCard className="rounded-[6px] border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-4 text-[12px] text-[var(--admin-text-secondary)] shadow-[var(--admin-shadow)] backdrop-blur-[2px]">
          Carregando configuracoes...
        </SectionCard>
      ) : null}

      {page === 'hub' ? (
        <ConfigHub
          departments={departments}
          topics={topics}
          teams={teams}
          routingRules={routingRules}
        />
      ) : null}

      {page === 'departments' ? (
        <DepartmentsPage
          departments={filteredDepartments}
          totalDepartments={departments.length}
          selectedDepartmentId={selectedDepartmentId}
          onSelectDepartment={setSelectedDepartmentId}
          onRefresh={refreshCatalog}
          canManageDepartments={canManageDepartments}
        />
      ) : null}

      {page === 'topics' ? (
        <TopicsPage
          departments={departments}
          topics={filteredTopics}
          selectedDepartmentId={selectedDepartmentId}
          onSelectDepartment={setSelectedDepartmentId}
          onRefresh={refreshCatalog}
        />
      ) : null}

      {page === 'teams' ? (
        <TeamsPage
          departments={departments}
          teams={filteredTeams}
          users={usersQuery.data?.items ?? []}
          selectedDepartment={selectedDepartment}
          onRefresh={refreshCatalog}
        />
      ) : null}

      {page === 'routing' ? (
        <RoutingRulesPage
          departments={departments}
          teams={teams}
          routingRules={filteredRoutingRules}
          selectedDepartment={selectedDepartment}
          onRefresh={refreshCatalog}
        />
      ) : null}

      {page === 'forms' ? (
        <FormsTab
          topics={filteredTopics}
          selectedTopicId={selectedTopicId}
          selectedTopic={selectedTopic}
          onSelectTopic={setSelectedTopicId}
          onRefresh={refreshCatalog}
        />
      ) : null}
    </main>
  );
}

function ConfigToolbar({
  page,
  searchTerm,
  onSearchTermChange,
}: {
  page: AdminPage;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
}) {
  const searchPlaceholder: Record<AdminPage, string> = {
    hub: 'Buscar',
    departments: 'Buscar setor',
    topics: 'Buscar assunto',
    teams: 'Buscar equipe',
    routing: 'Buscar regra',
    approvals: 'Buscar aprovacao',
    forms: 'Buscar formulario',
  };

  return (
    <section className="rounded-[6px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-2.5 text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)] backdrop-blur-[2px]">
      <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(200px,260px)] lg:items-center">
        <div className="grid min-w-0 grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-5">
          {configPages.map(({ id, label, to, icon: Icon }) => (
            <NavLink
              key={id}
              to={to}
              className={({ isActive }) =>
                cn(
                  'inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-[4px] border px-1.5 text-[10px] font-semibold transition',
                  isActive || page === id
                    ? 'border-[var(--admin-border-strong)] bg-[var(--admin-panel-active)] text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)]'
                    : 'border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-panel-active)] hover:text-[var(--admin-text-primary)]',
                )
              }
            >
              <Icon size={13} />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </div>

        {page === 'hub' ? (
          <NavLink
            to="/atendimentos"
            className="inline-flex h-8 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2 text-[10.5px] font-semibold text-[var(--admin-text-secondary)] transition hover:bg-[var(--admin-panel-active)] hover:text-[var(--admin-text-primary)]"
          >
            Voltar aos atendimentos
          </NavLink>
        ) : (
          <label className="flex h-8 min-w-0 items-center gap-2 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2.5 text-[12px] text-[var(--admin-text-secondary)] focus-within:border-[var(--admin-border-strong)]">
            <Search size={14} className="shrink-0 text-[var(--admin-text-muted)]" />
            <input
              type="search"
              aria-label="Buscar configuracoes"
              placeholder={searchPlaceholder[page]}
              value={searchTerm}
              onChange={(event) => onSearchTermChange(event.currentTarget.value)}
              className="min-w-0 flex-1 bg-transparent text-[12px] text-[var(--admin-text-primary)] outline-none placeholder:text-[var(--admin-text-muted)]"
            />
          </label>
        )}
      </div>
    </section>
  );
}

function CatalogLoadError({
  message,
  onRetry,
  retrying,
}: {
  message: string;
  onRetry: () => void;
  retrying: boolean;
}) {
  return (
    <SectionCard className="rounded-[6px] border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.10)] p-3 text-[rgba(255,235,235,0.96)] shadow-[var(--admin-shadow)] backdrop-blur-[2px]">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold">Nao foi possivel carregar as configuracoes.</p>
          <p className="mt-0.5 break-words text-[11px] leading-4 text-[rgba(255,220,220,0.82)]">
            {message}
          </p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="inline-flex h-8 w-full items-center justify-center rounded-[4px] border border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.08)] px-2.5 text-[10.5px] font-semibold text-[rgba(255,245,245,0.96)] transition hover:bg-[rgba(255,255,255,0.14)] disabled:opacity-50 sm:w-[104px]"
        >
          {retrying ? 'Tentando...' : 'Recarregar'}
        </button>
      </div>
    </SectionCard>
  );
}

function ConfigHub({
  departments,
  topics,
  teams,
  routingRules,
}: {
  departments: CatalogAdminDepartment[];
  topics: CatalogAdminTopic[];
  teams: CatalogAdminTeam[];
  routingRules: CatalogAdminRoutingRule[];
}) {
  const counts: Record<Exclude<AdminPage, 'hub'>, string | number> = {
    departments: departments.length,
    topics: topics.length,
    teams: teams.length,
    routing: routingRules.length,
    approvals: 'Abrir',
    forms: topics.reduce((total, topic) => total + topic.forms.length, 0),
  };

  return (
    <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {configPages.map(({ id, label, description, to, icon: Icon }) => (
        <NavLink
          key={id}
          to={to}
          className="group rounded-[6px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-3 text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)] backdrop-blur-[2px] transition hover:border-[var(--admin-border-strong)] hover:bg-[var(--admin-panel-active)]"
        >
          <span className="flex items-center justify-between gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)] transition group-hover:text-[var(--admin-text-primary)]">
              <Icon size={15} />
            </span>
            <span className="text-[16px] font-semibold tabular-nums">{counts[id]}</span>
          </span>
          <span className="mt-3 block text-[12.5px] font-semibold">{label}</span>
          <span className="mt-0.5 block text-[11px] leading-4 text-[var(--admin-text-secondary)]">
            {description}
          </span>
        </NavLink>
      ))}
    </section>
  );
}

function DepartmentsPage({
  departments,
  totalDepartments,
  selectedDepartmentId,
  onSelectDepartment,
  onRefresh,
  canManageDepartments,
}: {
  departments: Awaited<ReturnType<typeof listSupportCatalogAdmin>>['departments'];
  totalDepartments: number;
  selectedDepartmentId: string;
  onSelectDepartment: (id: string) => void;
  onRefresh: () => void;
  canManageDepartments: boolean;
}) {
  const [departmentForm, setDepartmentForm] = useState({
    code: '',
    name: '',
    description: '',
    sortOrder: 100,
    status: 'ACTIVE' as CatalogStatus,
  });
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null);
  const resetDepartmentForm = () => {
    setEditingDepartmentId(null);
    setDepartmentForm({
      code: '',
      name: '',
      description: '',
      sortOrder: 100,
      status: 'ACTIVE',
    });
  };
  const departmentMutation = useMutation({
    mutationFn: () => {
      if (editingDepartmentId) {
        return updateSupportDepartment(editingDepartmentId, departmentForm);
      }

      return upsertSupportDepartment(departmentForm);
    },
    onSuccess: () => {
      resetDepartmentForm();
      onRefresh();
    },
  });
  const deleteDepartmentMutation = useMutation({
    mutationFn: deleteSupportDepartment,
    onSuccess: onRefresh,
  });
  const toggleDepartmentMutation = useMutation({
    mutationFn: (department: CatalogAdminDepartment) =>
      updateSupportDepartment(department.id, {
        code: department.code,
        name: department.name,
        description: department.description ?? undefined,
        sortOrder: department.sortOrder,
        status: department.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
      }),
    onSuccess: onRefresh,
  });

  const handleDepartmentSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManageDepartments) {
      return;
    }

    departmentMutation.mutate();
  };

  const handleEditDepartment = (department: CatalogAdminDepartment) => {
    setEditingDepartmentId(department.id);
    setDepartmentForm({
      code: department.code,
      name: department.name,
      description: department.description ?? '',
      sortOrder: department.sortOrder,
      status: department.status,
    });
    onSelectDepartment(department.id);
  };

  const handleToggleDepartmentStatus = (department: CatalogAdminDepartment) => {
    if (!canManageDepartments) {
      return;
    }

    toggleDepartmentMutation.mutate(department);
  };

  const handleDeleteDepartment = (department: CatalogAdminDepartment) => {
    if (!canManageDepartments) {
      return;
    }

    const confirmed = window.confirm(
      `Excluir ou inativar o setor ${department.name}? Se houver vinculos, ele sera apenas inativado.`,
    );

    if (!confirmed) {
      return;
    }

    deleteDepartmentMutation.mutate(department.id);
  };

  return (
    <section className="grid gap-2 lg:grid-cols-[minmax(240px,0.62fr)_minmax(0,1.38fr)]">
      {canManageDepartments ? (
        <SectionCard className="rounded-[6px] border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-3 text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)] backdrop-blur-[2px]">
          <form onSubmit={handleDepartmentSubmit} className="grid gap-2">
            <PanelTitle icon={<Plus size={14} />} title={editingDepartmentId ? 'Editar setor' : 'Novo setor'} />
            <FormGrid>
              <Field label="Codigo">
                <input
                  value={departmentForm.code}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setDepartmentForm((current) => ({
                      ...current,
                      code: value,
                    }));
                  }}
                  placeholder="FINANCEIRO"
                  className={compactInput}
                />
              </Field>
              <Field label="Nome">
                <input
                  value={departmentForm.name}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setDepartmentForm((current) => ({
                      ...current,
                      name: value,
                    }));
                  }}
                  placeholder="Financeiro"
                  className={compactInput}
                />
              </Field>
              <Field label="Descricao">
                <textarea
                  value={departmentForm.description}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setDepartmentForm((current) => ({
                      ...current,
                      description: value,
                    }));
                  }}
                  placeholder="Uso interno"
                  className={compactTextarea}
                />
              </Field>
              <SmallFields>
                <NumberField
                  label="Ordem"
                  value={departmentForm.sortOrder}
                  onChange={(value) =>
                    setDepartmentForm((current) => ({ ...current, sortOrder: value }))
                  }
                />
                <StatusField
                  value={departmentForm.status}
                  onChange={(status) =>
                    setDepartmentForm((current) => ({ ...current, status }))
                  }
                />
              </SmallFields>
            </FormGrid>
            <div className="grid gap-1.5 sm:grid-cols-2">
              <SubmitButton pending={departmentMutation.isPending} label={editingDepartmentId ? 'Atualizar setor' : 'Salvar setor'} />
              <button type="button" onClick={resetDepartmentForm} className={compactButton}>
                Novo
              </button>
            </div>
            <MutationError mutation={departmentMutation} />
          </form>
        </SectionCard>
      ) : (
        <SectionCard className="rounded-[6px] border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-3 text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)] backdrop-blur-[2px]">
          <div className="grid gap-2">
            <PanelTitle icon={<ClipboardList size={14} />} title="Setores globais" />
            <p className="text-[12px] leading-5 text-[var(--admin-text-secondary)]">
              Setores sao mantidos pela administracao global. Use esta lista como
              referencia para assuntos, equipes, regras e formularios do seu escopo.
            </p>
          </div>
        </SectionCard>
      )}

      <DepartmentsList
        departments={departments}
        totalDepartments={totalDepartments}
        selectedDepartmentId={selectedDepartmentId}
        onSelectDepartment={onSelectDepartment}
        onEditDepartment={handleEditDepartment}
        onToggleDepartmentStatus={handleToggleDepartmentStatus}
        onDeleteDepartment={handleDeleteDepartment}
        deletingId={deleteDepartmentMutation.variables}
        togglingId={toggleDepartmentMutation.variables?.id}
        canManageDepartments={canManageDepartments}
      />
      <MutationError mutation={deleteDepartmentMutation} />
      <MutationError mutation={toggleDepartmentMutation} />
    </section>
  );
}

function DepartmentsList({
  departments,
  totalDepartments,
  selectedDepartmentId,
  onSelectDepartment,
  onEditDepartment,
  onToggleDepartmentStatus,
  onDeleteDepartment,
  deletingId,
  togglingId,
  canManageDepartments,
}: {
  departments: CatalogAdminDepartment[];
  totalDepartments: number;
  selectedDepartmentId: string;
  onSelectDepartment: (id: string) => void;
  onEditDepartment: (department: CatalogAdminDepartment) => void;
  onToggleDepartmentStatus: (department: CatalogAdminDepartment) => void;
  onDeleteDepartment: (department: CatalogAdminDepartment) => void;
  deletingId?: string;
  togglingId?: string;
  canManageDepartments: boolean;
}) {
  return (
    <SectionCard className="overflow-hidden rounded-[6px] border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-0 text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)] backdrop-blur-[2px]">
      <div className="divide-y divide-[var(--admin-border)]">
        {departments.length === 0 ? (
          <div className="px-3 py-5 text-center">
            <p className="text-[12px] font-semibold text-[var(--admin-text-primary)]">
              {totalDepartments === 0 ? 'Nenhum setor cadastrado.' : 'Nenhum setor encontrado.'}
            </p>
            <p className="mt-1 text-[11px] leading-4 text-[var(--admin-text-secondary)]">
              {totalDepartments === 0
                ? 'Quando o catalogo carregar setores, eles aparecem nesta lista.'
                : 'Limpe ou ajuste a busca para ver os setores cadastrados.'}
            </p>
          </div>
        ) : null}
        {departments.map((department) => (
          <div
            key={department.id}
            className={cn(
              adminRowClass,
              'sm:grid-cols-[minmax(0,1fr)_64px_184px]',
              selectedDepartmentId === department.id ? 'bg-[var(--admin-panel-active)]' : '',
            )}
          >
            <button
              type="button"
              onClick={() => onSelectDepartment(department.id)}
              className="min-w-0 text-left"
            >
              <span className="flex items-center gap-1.5">
                <span className="truncate text-[12.5px] font-semibold">{department.name}</span>
                <StatusPill label={department.status === 'ACTIVE' ? 'ativo' : 'inativo'} tone="neutral" />
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-[var(--admin-text-muted)]">
                {department.code} • {department.topics.length} assuntos
              </span>
            </button>
            <span className="hidden text-right text-[10.5px] text-[var(--admin-text-muted)] sm:block">{department.sortOrder}</span>
            <div className={adminActionCellClass}>
              {canManageDepartments ? (
                <>
                  <button
                    type="button"
                    onClick={() => onEditDepartment(department)}
                    className={ghostButton}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleDepartmentStatus(department)}
                    disabled={togglingId === department.id}
                    className={ghostButton}
                  >
                    {department.status === 'ACTIVE' ? 'Inativar' : 'Ativar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteDepartment(department)}
                    disabled={deletingId === department.id}
                    className={dangerButton}
                  >
                    Excluir
                  </button>
                </>
              ) : (
                <span className="col-span-3 inline-flex h-7 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2 text-[10px] font-semibold text-[var(--admin-text-muted)] sm:w-[184px]">
                  Somente leitura
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function TopicsPage({
  departments,
  topics,
  selectedDepartmentId,
  onSelectDepartment,
  onRefresh,
}: {
  departments: CatalogAdminDepartment[];
  topics: CatalogAdminTopic[];
  selectedDepartmentId: string;
  onSelectDepartment: (id: string) => void;
  onRefresh: () => void;
}) {
  const [topicForm, setTopicForm] = useState({
    code: '',
    name: '',
    description: '',
    defaultPriority: 'NORMAL' as SupportCasePriority,
    openingPolicy: 'CONTINUOUS_CONVERSATION' as SupportCaseOpeningPolicy,
    businessKeyFieldCode: '',
    sortOrder: 100,
    status: 'ACTIVE' as CatalogStatus,
  });
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const resetTopicForm = () => {
    setEditingTopicId(null);
    setTopicForm({
      code: '',
      name: '',
      description: '',
      defaultPriority: 'NORMAL',
      openingPolicy: 'CONTINUOUS_CONVERSATION',
      businessKeyFieldCode: '',
      sortOrder: 100,
      status: 'ACTIVE',
    });
  };
  const selectedDepartment = departments.find(
    (department) => department.id === selectedDepartmentId,
  );
  const topicMutation = useMutation({
    mutationFn: (payload: {
      departmentId: string;
      code: string;
      name: string;
      description: string;
      defaultPriority: SupportCasePriority;
      openingPolicy: SupportCaseOpeningPolicy;
      businessKeyFieldCode: string;
      sortOrder: number;
      status: CatalogStatus;
    }) => {
      if (editingTopicId) {
        return updateSupportTopic(editingTopicId, payload);
      }

      return upsertSupportTopic(payload);
    },
    onSuccess: () => {
      resetTopicForm();
      onRefresh();
    },
  });
  const deleteTopicMutation = useMutation({
    mutationFn: deleteSupportTopic,
    onSuccess: onRefresh,
  });

  const handleTopicSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedDepartment) {
      return;
    }

    topicMutation.mutate({
      departmentId: selectedDepartment.id,
      ...topicForm,
    });
  };

  const handleEditTopic = (topic: CatalogAdminTopic) => {
    setEditingTopicId(topic.id);
    onSelectDepartment(topic.department.id);
    setTopicForm({
      code: topic.code,
      name: topic.name,
      description: topic.description ?? '',
      defaultPriority: topic.defaultPriority,
      openingPolicy: topic.openingPolicy,
      businessKeyFieldCode: topic.businessKeyFieldCode ?? '',
      sortOrder: topic.sortOrder,
      status: topic.status,
    });
  };

  const handleToggleTopicStatus = (topic: CatalogAdminTopic) => {
    updateSupportTopic(topic.id, {
      departmentId: topic.department.id,
      code: topic.code,
      name: topic.name,
      description: topic.description ?? undefined,
      defaultPriority: topic.defaultPriority,
      openingPolicy: topic.openingPolicy,
      businessKeyFieldCode: topic.businessKeyFieldCode ?? undefined,
      sortOrder: topic.sortOrder,
      status: topic.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
    }).then(onRefresh).catch(() => undefined);
  };

  const handleDeleteTopic = (topic: CatalogAdminTopic) => {
    const confirmed = window.confirm(
      `Excluir ou inativar o assunto ${topic.name}? Se houver vinculos, ele sera apenas inativado.`,
    );

    if (!confirmed) {
      return;
    }

    deleteTopicMutation.mutate(topic.id);
  };

  return (
    <section className="grid gap-2 lg:grid-cols-[minmax(250px,0.62fr)_minmax(0,1.38fr)]">
      <SectionCard className="rounded-[6px] border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-3 text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)] backdrop-blur-[2px]">
        <form onSubmit={handleTopicSubmit} className="grid gap-2">
          <PanelTitle icon={<Plus size={14} />} title={editingTopicId ? 'Editar assunto' : 'Novo assunto'} />
          <Field label="Setor">
            <select
              value={selectedDepartmentId}
              onChange={(event) => {
                const value = event.currentTarget.value;
                onSelectDepartment(value);
              }}
              className={compactInput}
            >
              {departments.map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </select>
          </Field>
          <SmallFields>
            <Field label="Codigo">
              <input
                value={topicForm.code}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setTopicForm((current) => ({ ...current, code: value }));
                }}
                placeholder="CONTRACHEQUE"
                className={compactInput}
              />
            </Field>
            <Field label="Nome">
              <input
                value={topicForm.name}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setTopicForm((current) => ({ ...current, name: value }));
                }}
                placeholder="Contracheque"
                className={compactInput}
              />
            </Field>
          </SmallFields>
          <SmallFields>
            <PriorityField
              value={topicForm.defaultPriority}
              onChange={(defaultPriority) =>
                setTopicForm((current) => ({ ...current, defaultPriority }))
              }
            />
            <NumberField
              label="Ordem"
              value={topicForm.sortOrder}
              onChange={(sortOrder) =>
                setTopicForm((current) => ({ ...current, sortOrder }))
              }
            />
          </SmallFields>
          <SmallFields>
            <Field label="Abertura">
              <select
                value={topicForm.openingPolicy}
                onChange={(event) => {
                  const value = event.currentTarget.value as SupportCaseOpeningPolicy;
                  setTopicForm((current) => ({
                    ...current,
                    openingPolicy: value,
                    businessKeyFieldCode:
                      value === 'BUSINESS_KEY' ? current.businessKeyFieldCode : '',
                  }));
                }}
                className={compactInput}
              >
                <option value="CONTINUOUS_CONVERSATION">Conversa continua</option>
                <option value="INDIVIDUAL_REQUEST">Solicitacao individual</option>
                <option value="BUSINESS_KEY">Chave de negocio</option>
              </select>
            </Field>
            <Field label="Campo-chave">
              <input
                value={topicForm.businessKeyFieldCode}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setTopicForm((current) => ({ ...current, businessKeyFieldCode: value }));
                }}
                disabled={topicForm.openingPolicy !== 'BUSINESS_KEY'}
                placeholder="codigoDoCampo"
                className={compactInput}
              />
            </Field>
          </SmallFields>
          <Field label="Descricao">
            <textarea
              value={topicForm.description}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setTopicForm((current) => ({
                  ...current,
                  description: value,
                }));
              }}
              placeholder="Quando o funcionario deve usar este assunto"
              className={compactTextarea}
            />
          </Field>
          <div className="grid gap-1.5 sm:grid-cols-2">
            <SubmitButton pending={topicMutation.isPending} label={editingTopicId ? 'Atualizar assunto' : 'Salvar assunto'} />
            <button type="button" onClick={resetTopicForm} className={compactButton}>
              Novo
            </button>
          </div>
          <MutationError mutation={topicMutation} />
        </form>
      </SectionCard>

      <SectionCard className="overflow-hidden rounded-[6px] border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-0 text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)] backdrop-blur-[2px]">
        <div className="divide-y divide-[var(--admin-border)]">
          {topics.map((topic) => (
            <div key={topic.id} className={cn(adminRowClass, 'sm:grid-cols-[minmax(0,1fr)_184px]')}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-[12.5px] font-semibold">{topic.name}</p>
                    <StatusPill label={topic.status === 'ACTIVE' ? 'ativo' : 'inativo'} tone="neutral" />
                  </div>
                  <p className="mt-0.5 truncate text-[10.5px] text-[var(--admin-text-muted)]">
                    {topic.department.name} • {topic.code} • {openingPolicyLabel[topic.openingPolicy]} • {topic.forms.length} formularios
                  </p>
                </div>
              </div>
              <div className={adminActionCellClass}>
                <button type="button" onClick={() => handleEditTopic(topic)} className={ghostButton}>
                  Editar
                </button>
                <button type="button" onClick={() => handleToggleTopicStatus(topic)} className={ghostButton}>
                  {topic.status === 'ACTIVE' ? 'Inativar' : 'Ativar'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteTopic(topic)}
                  disabled={deleteTopicMutation.variables === topic.id}
                  className={dangerButton}
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
      <MutationError mutation={deleteTopicMutation} />
    </section>
  );
}

function TeamsPage({
  departments,
  teams,
  users,
  selectedDepartment,
  onRefresh,
}: {
  departments: CatalogAdminDepartment[];
  teams: CatalogAdminTeam[];
  users: Awaited<ReturnType<typeof listSupportAssignableUsers>>['items'];
  selectedDepartment?: CatalogAdminDepartment;
  onRefresh: () => void;
}) {
  const [teamForm, setTeamForm] = useState({
    departmentId: selectedDepartment?.id ?? '',
    code: '',
    name: '',
    status: 'ACTIVE' as CatalogStatus,
  });
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [memberForm, setMemberForm] = useState({
    teamId: '',
    userId: '',
  });
  const resetTeamForm = () => {
    setEditingTeamId(null);
    setTeamForm({
      departmentId: selectedDepartment?.id ?? '',
      code: '',
      name: '',
      status: 'ACTIVE',
    });
  };

  useEffect(() => {
    if (!selectedDepartment?.id) {
      return;
    }

    setTeamForm((current) => ({
      ...current,
      departmentId: current.departmentId || selectedDepartment.id,
    }));
  }, [selectedDepartment?.id]);

  const teamMutation = useMutation({
    mutationFn: (payload: {
      departmentId?: string;
      code: string;
      name: string;
      status: CatalogStatus;
    }) => {
      if (editingTeamId) {
        return updateSupportTeam(editingTeamId, payload);
      }

      return upsertSupportTeam(payload);
    },
    onSuccess: () => {
      resetTeamForm();
      onRefresh();
    },
  });
  const memberMutation = useMutation({
    mutationFn: upsertSupportTeamMember,
    onSuccess: () => {
      setMemberForm({ teamId: '', userId: '' });
      onRefresh();
    },
  });
  const deleteTeamMutation = useMutation({
    mutationFn: deleteSupportTeam,
    onSuccess: onRefresh,
  });
  const deleteMemberMutation = useMutation({
    mutationFn: deleteSupportTeamMember,
    onSuccess: onRefresh,
  });

  const handleTeamSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    teamMutation.mutate({
      departmentId: teamForm.departmentId || undefined,
      code: teamForm.code,
      name: teamForm.name,
      status: teamForm.status,
    });
  };

  const handleEditTeam = (team: CatalogAdminTeam) => {
    setEditingTeamId(team.id);
    setTeamForm({
      departmentId: team.department?.id ?? '',
      code: team.code,
      name: team.name,
      status: team.status,
    });
  };

  const handleToggleTeamStatus = (team: CatalogAdminTeam) => {
    updateSupportTeam(team.id, {
      departmentId: team.department?.id,
      code: team.code,
      name: team.name,
      status: team.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
    }).then(onRefresh).catch(() => undefined);
  };

  const handleToggleMemberStatus = (
    member: CatalogAdminTeam['members'][number],
    teamId: string,
  ) => {
    upsertSupportTeamMember({
      teamId,
      userId: member.user.id,
      role: member.role as 'AGENT' | 'MEMBER' | 'OBSERVER' | 'REQUESTER',
      status: member.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
    }).then(onRefresh).catch(() => undefined);
  };

  const handleMemberSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!memberForm.teamId || !memberForm.userId) {
      return;
    }

    memberMutation.mutate({
      ...memberForm,
      role: 'AGENT',
      status: 'ACTIVE',
    });
  };

  const handleDeleteTeam = (team: CatalogAdminTeam) => {
    const confirmed = window.confirm(
      `Excluir ou inativar a equipe ${team.name}? Se houver vinculos, ela sera apenas inativada.`,
    );

    if (!confirmed) {
      return;
    }

    deleteTeamMutation.mutate(team.id);
  };

  const handleDeleteMember = (memberId: string) => {
    const confirmed = window.confirm(
      'Remover este atendente da equipe? Se houver historico, o vinculo sera apenas inativado.',
    );

    if (!confirmed) {
      return;
    }

    deleteMemberMutation.mutate(memberId);
  };

  return (
    <section className="grid gap-2 lg:grid-cols-[minmax(260px,0.7fr)_minmax(0,1.3fr)]">
      <SectionCard className="rounded-[6px] border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-3 text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)] backdrop-blur-[2px]">
        <form onSubmit={handleTeamSubmit} className="grid gap-2">
          <PanelTitle icon={<UsersRound size={14} />} title={editingTeamId ? 'Editar equipe' : 'Equipe'} />
          <Field label="Setor">
            <select
              value={teamForm.departmentId}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setTeamForm((current) => ({
                  ...current,
                  departmentId: value,
                }));
              }}
              className={compactInput}
            >
              <option value="">Sem setor fixo</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </select>
          </Field>
          <SmallFields>
            <Field label="Codigo">
              <input
                value={teamForm.code}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setTeamForm((current) => ({ ...current, code: value }));
                }}
                placeholder="RH_FERIAS"
                className={compactInput}
              />
            </Field>
            <StatusField
              value={teamForm.status}
              onChange={(status) =>
                setTeamForm((current) => ({ ...current, status }))
              }
            />
          </SmallFields>
          <Field label="Nome">
            <input
              value={teamForm.name}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setTeamForm((current) => ({ ...current, name: value }));
              }}
              placeholder="Equipe de ferias"
              className={compactInput}
            />
          </Field>
          <div className="grid gap-1.5 sm:grid-cols-2">
            <SubmitButton pending={teamMutation.isPending} label={editingTeamId ? 'Atualizar equipe' : 'Salvar equipe'} />
            <button type="button" onClick={resetTeamForm} className={compactButton}>
              Nova
            </button>
          </div>
          <MutationError mutation={teamMutation} />
        </form>

        <form onSubmit={handleMemberSubmit} className="mt-4 grid gap-2 border-t border-[var(--admin-border)] pt-3">
          <PanelTitle icon={<Plus size={14} />} title="Atendente" />
          <Field label="Equipe">
            <select
              value={memberForm.teamId}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setMemberForm((current) => ({ ...current, teamId: value }));
              }}
              className={compactInput}
            >
              <option value="">Selecione</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Usuario">
            <select
              value={memberForm.userId}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setMemberForm((current) => ({ ...current, userId: value }));
              }}
              className={compactInput}
            >
              <option value="">Selecione</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </Field>
          <SubmitButton pending={memberMutation.isPending} label="Vincular" />
          <MutationError mutation={memberMutation} />
        </form>
      </SectionCard>

      <div className="grid gap-2">
        <TeamsList
          teams={teams}
          onEditTeam={handleEditTeam}
          onToggleTeamStatus={handleToggleTeamStatus}
          onToggleMemberStatus={handleToggleMemberStatus}
          onDeleteTeam={handleDeleteTeam}
          onDeleteMember={handleDeleteMember}
          deletingTeamId={deleteTeamMutation.variables}
          deletingMemberId={deleteMemberMutation.variables}
        />
        <MutationError mutation={deleteTeamMutation} />
        <MutationError mutation={deleteMemberMutation} />
      </div>
    </section>
  );
}

function RoutingRulesPage({
  departments,
  teams,
  routingRules,
  selectedDepartment,
  onRefresh,
}: {
  departments: CatalogAdminDepartment[];
  teams: CatalogAdminTeam[];
  routingRules: CatalogAdminRoutingRule[];
  selectedDepartment?: CatalogAdminDepartment;
  onRefresh: () => void;
}) {
  const [ruleForm, setRuleForm] = useState({
    departmentId: selectedDepartment?.id ?? '',
    topicId: '',
    teamId: '',
    priority: 100,
    status: 'ACTIVE' as CatalogStatus,
    conditionMode: 'all' as RoutingConditionMode,
    conditions: [] as RoutingConditionDraft[],
  });
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleFormError, setRuleFormError] = useState<string | null>(null);
  const resetRuleForm = () => {
    setEditingRuleId(null);
    setRuleFormError(null);
    setRuleForm({
      departmentId: selectedDepartment?.id ?? '',
      topicId: '',
      teamId: '',
      priority: 100,
      status: 'ACTIVE',
      conditionMode: 'all',
      conditions: [],
    });
  };

  useEffect(() => {
    if (!selectedDepartment?.id) {
      return;
    }

    setRuleForm((current) => ({
      ...current,
      departmentId: current.departmentId || selectedDepartment.id,
    }));
  }, [selectedDepartment?.id]);

  const selectedRuleDepartment = departments.find(
    (department) => department.id === ruleForm.departmentId,
  );
  const selectedRuleTopic = selectedRuleDepartment?.topics.find(
    (topic) => topic.id === ruleForm.topicId,
  );
  const selectedRuleFields = selectedRuleTopic?.forms[0]?.fields ?? [];
  const ruleMutation = useMutation({
    mutationFn: (payload: {
      departmentId: string;
      topicId?: string;
      teamId: string;
      priority: number;
      status: CatalogStatus;
      conditions?: Record<string, unknown>;
    }) => {
      if (editingRuleId) {
        return updateSupportRoutingRule(editingRuleId, payload);
      }

      return upsertSupportRoutingRule(payload);
    },
    onSuccess: () => {
      resetRuleForm();
      onRefresh();
    },
  });
  const deleteRuleMutation = useMutation({
    mutationFn: deleteSupportRoutingRule,
    onSuccess: onRefresh,
  });

  const handleRuleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!ruleForm.departmentId || !ruleForm.teamId) {
      return;
    }

    const conditions = buildRoutingConditions(
      ruleForm.conditionMode,
      ruleForm.conditions,
    );

    if (conditions.status === 'INVALID') {
      setRuleFormError(conditions.message);
      return;
    }

    setRuleFormError(null);
    ruleMutation.mutate({
      departmentId: ruleForm.departmentId,
      topicId: ruleForm.topicId || undefined,
      teamId: ruleForm.teamId,
      priority: ruleForm.priority,
      status: ruleForm.status,
      conditions: conditions.value,
    });
  };

  const handleEditRule = (rule: CatalogAdminRoutingRule) => {
    setEditingRuleId(rule.id);
    setRuleForm({
      departmentId: rule.department.id,
      topicId: rule.topic?.id ?? '',
      teamId: rule.team.id,
      priority: rule.priority,
      status: rule.status,
      ...conditionDraftsFromRule(rule.conditions),
    });
  };

  const handleToggleRuleStatus = (rule: CatalogAdminRoutingRule) => {
    updateSupportRoutingRule(rule.id, {
      departmentId: rule.department.id,
      topicId: rule.topic?.id,
      teamId: rule.team.id,
      priority: rule.priority,
      status: rule.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
      conditions: objectConditionsOrUndefined(rule.conditions),
    }).then(onRefresh).catch(() => undefined);
  };

  const handleDeleteRule = (rule: CatalogAdminRoutingRule) => {
    const confirmed = window.confirm(
      `Excluir a regra ${rule.department.name} / ${rule.topic?.name ?? 'Todos'}?`,
    );

    if (!confirmed) {
      return;
    }

    deleteRuleMutation.mutate(rule.id);
  };

  return (
    <section className="grid gap-2 lg:grid-cols-[minmax(260px,0.62fr)_minmax(0,1.38fr)]">
      <SectionCard className="rounded-[6px] border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-3 text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)] backdrop-blur-[2px]">
        <form onSubmit={handleRuleSubmit} className="grid gap-2">
          <PanelTitle icon={<GitBranch size={14} />} title={editingRuleId ? 'Editar regra' : 'Regra'} />
          <Field label="Setor">
            <select
              value={ruleForm.departmentId}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setRuleForm((current) => ({
                  ...current,
                  departmentId: value,
                  topicId: '',
                  conditions: [],
                }));
              }}
              className={compactInput}
            >
              <option value="">Selecione</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Assunto">
            <select
              value={ruleForm.topicId}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setRuleForm((current) => ({
                  ...current,
                  topicId: value,
                  conditions: [],
                }));
              }}
              className={compactInput}
            >
              <option value="">Todos do setor</option>
              {(selectedRuleDepartment?.topics ?? []).map((topic) => (
                <option key={topic.id} value={topic.id}>{topic.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Equipe destino">
            <select
              value={ruleForm.teamId}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setRuleForm((current) => ({ ...current, teamId: value }));
              }}
              className={compactInput}
            >
              <option value="">Selecione</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </Field>
          <SmallFields>
            <NumberField
              label="Prioridade"
              value={ruleForm.priority}
              onChange={(priority) =>
                setRuleForm((current) => ({ ...current, priority }))
              }
            />
            <StatusField
              value={ruleForm.status}
              onChange={(status) =>
                setRuleForm((current) => ({ ...current, status }))
              }
            />
          </SmallFields>
          <RoutingConditionsBuilder
            fields={selectedRuleFields}
            mode={ruleForm.conditionMode}
            conditions={ruleForm.conditions}
            onModeChange={(conditionMode) =>
              setRuleForm((current) => ({ ...current, conditionMode }))
            }
            onConditionsChange={(conditions) => {
              setRuleForm((current) => ({ ...current, conditions }));
              setRuleFormError(null);
            }}
          />
          <div className="grid gap-1.5 sm:grid-cols-2">
            <SubmitButton pending={ruleMutation.isPending} label={editingRuleId ? 'Atualizar regra' : 'Salvar regra'} />
            <button type="button" onClick={resetRuleForm} className={compactButton}>
              Nova
            </button>
          </div>
          {ruleFormError ? (
            <p className="text-[11px] text-[var(--admin-danger-text)]">{ruleFormError}</p>
          ) : null}
          <MutationError mutation={ruleMutation} />
        </form>
      </SectionCard>

      <SectionCard className="overflow-hidden rounded-[6px] border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-0 text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)] backdrop-blur-[2px]">
        <div className="divide-y divide-[var(--admin-border)]">
          {routingRules.map((rule) => (
            <div key={rule.id} className={cn(adminRowClass, 'sm:grid-cols-[minmax(0,1fr)_184px]')}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-[12.5px] font-semibold">
                      {rule.department.name} / {rule.topic?.name ?? 'Todos'}
                    </p>
                    <StatusPill label={rule.status === 'ACTIVE' ? 'ativa' : 'inativa'} tone="neutral" />
                  </div>
                  <p className="mt-0.5 truncate text-[10.5px] text-[var(--admin-text-muted)]">
                    {rule.team.name} • prioridade {rule.priority} • {routingConditionSummary(rule.conditions)}
                  </p>
                </div>
              </div>
              <div className={adminActionCellClass}>
                <button type="button" onClick={() => handleEditRule(rule)} className={ghostButton}>
                  Editar
                </button>
                <button type="button" onClick={() => handleToggleRuleStatus(rule)} className={ghostButton}>
                  {rule.status === 'ACTIVE' ? 'Inativar' : 'Ativar'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteRule(rule)}
                  disabled={deleteRuleMutation.variables === rule.id}
                  className={dangerButton}
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
      <MutationError mutation={deleteRuleMutation} />
    </section>
  );
}

function RoutingConditionsBuilder({
  fields,
  mode,
  conditions,
  onModeChange,
  onConditionsChange,
}: {
  fields: CatalogAdminTopic['forms'][number]['fields'];
  mode: RoutingConditionMode;
  conditions: RoutingConditionDraft[];
  onModeChange: (mode: RoutingConditionMode) => void;
  onConditionsChange: (conditions: RoutingConditionDraft[]) => void;
}) {
  const addCondition = () => {
    onConditionsChange([
      ...conditions,
      {
        id: newConditionDraftId(),
        fieldCode: fields[0]?.code ?? '',
        operator: 'equals',
        value: '',
      },
    ]);
  };
  const updateCondition = (
    conditionId: string,
    patch: Partial<RoutingConditionDraft>,
  ) => {
    onConditionsChange(
      conditions.map((condition) =>
        condition.id === conditionId ? { ...condition, ...patch } : condition,
      ),
    );
  };
  const removeCondition = (conditionId: string) => {
    onConditionsChange(
      conditions.filter((condition) => condition.id !== conditionId),
    );
  };
  const canAddCondition = fields.length > 0;
  const emptyState = canAddCondition
    ? 'Sem condicoes. Esta regra funciona como fallback.'
    : 'Escolha um assunto com formulario para criar condicoes.';

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className={labelClass}>Condicoes</span>
        <div className="grid grid-cols-2 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-0.5">
          {(['all', 'any'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onModeChange(option)}
              className={cn(
                'h-6 rounded-[4px] px-2 text-[9.5px] font-semibold transition',
                mode === option
                  ? 'bg-[var(--admin-panel-active)] text-[var(--admin-text-primary)]'
                  : 'text-[var(--admin-text-muted)] hover:text-[var(--admin-text-primary)]',
              )}
            >
              {option === 'all' ? 'Todas (E)' : 'Qualquer (OU)'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-1.5 rounded-[6px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-2">
        {conditions.length === 0 ? (
          <p className="text-[10.5px] leading-4 text-[var(--admin-text-muted)]">
            {emptyState}
          </p>
        ) : null}

        {conditions.map((condition, index) => {
          const selectedField = fields.find((field) => field.code === condition.fieldCode);
          const options = fieldValueOptions(selectedField);
          const showValue = condition.operator !== 'exists';

          return (
            <div
              key={condition.id}
              className="grid gap-1.5 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-2 sm:grid-cols-[34px_minmax(0,1fr)_104px_minmax(0,1fr)_64px] sm:items-end"
            >
              <div className="hidden h-8 items-center text-[10px] font-semibold text-[var(--admin-text-muted)] sm:flex">
                Se
              </div>
              <Field label="Campo">
                <select
                  aria-label={`Campo da condicao ${index + 1}`}
                  value={condition.fieldCode}
                  onChange={(event) => {
                    const fieldCode = event.currentTarget.value;
                    updateCondition(condition.id, { fieldCode, value: '' });
                  }}
                  className={compactInput}
                >
                  <option value="">Selecione</option>
                  {fields.map((field) => (
                    <option key={field.id} value={field.code}>{field.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Regra">
                <select
                  aria-label={`Operador da condicao ${index + 1}`}
                  value={condition.operator}
                  onChange={(event) => {
                    const operator = event.currentTarget.value as RoutingConditionOperator;
                    updateCondition(condition.id, { operator, value: '' });
                  }}
                  className={compactInput}
                >
                  <option value="equals">=</option>
                  <option value="notEquals">!=</option>
                  <option value="in">em</option>
                  <option value="contains">contem</option>
                  <option value="exists">preenchido</option>
                </select>
              </Field>
              <Field label="Valor">
                {showValue ? (
                  <ConditionValueInput
                    ariaLabel={`Valor da condicao ${index + 1}`}
                    field={selectedField}
                    options={options}
                    operator={condition.operator}
                    value={condition.value}
                    onChange={(value) => updateCondition(condition.id, { value })}
                  />
                ) : (
                  <input
                    aria-label={`Valor da condicao ${index + 1}`}
                    value="sim"
                    disabled
                    className={compactInput}
                  />
                )}
              </Field>
              <button
                type="button"
                onClick={() => removeCondition(condition.id)}
                className={conditionButton}
              >
                Remover
              </button>
            </div>
          );
        })}

        <button
          type="button"
          onClick={addCondition}
          disabled={!canAddCondition}
          className={cn(conditionButton, 'w-full gap-1')}
        >
          <Plus size={13} />
          Adicionar condicao
        </button>
      </div>
    </div>
  );
}

type ConditionValueField = {
  type: SupportFormFieldType;
  options?: unknown;
};

function ConditionValueInput({
  ariaLabel,
  field,
  options,
  operator,
  value,
  onChange,
}: {
  ariaLabel: string;
  field?: ConditionValueField;
  options: string[];
  operator: RoutingConditionOperator;
  value: string;
  onChange: (value: string) => void;
}) {
  if (field?.type === 'BOOLEAN') {
    return (
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        className={compactInput}
      >
        <option value="">Selecione</option>
        <option value="true">Sim</option>
        <option value="false">Nao</option>
      </select>
    );
  }

  if (options.length > 0 && operator !== 'in') {
    return (
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        className={compactInput}
      >
        <option value="">Selecione</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    );
  }

  return (
    <input
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
      placeholder={operator === 'in' ? 'valor A, valor B' : 'Valor'}
      className={compactInput}
    />
  );
}

function FieldConditionEditor({
  label,
  sources,
  condition,
  onChange,
}: {
  label: string;
  sources: DraftField[];
  condition: FieldConditionDraft;
  onChange: (condition: FieldConditionDraft) => void;
}) {
  const availableSources = sources.filter(
    (source) => source.code.trim().length > 0 && source.label.trim().length > 0,
  );
  const selectedSource = availableSources.find(
    (source) => source.code === condition.sourceCode,
  );
  const options = draftFieldOptions(selectedSource);
  const showValue = condition.operator !== 'exists';

  return (
    <div className="grid min-w-0 gap-1">
      <span className={labelClass}>{label}</span>
      <div className="grid gap-1 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-1.5">
        <select
          aria-label={`${label} campo`}
          value={condition.sourceCode}
          disabled={availableSources.length === 0}
          onChange={(event) =>
            onChange({
              ...condition,
              sourceCode: event.currentTarget.value,
              value: '',
            })
          }
          className={compactInput}
        >
          <option value="">Sempre</option>
          {availableSources.map((source) => (
            <option key={source.code} value={source.code}>{source.label}</option>
          ))}
        </select>

        {condition.sourceCode ? (
          <div className="grid gap-1 sm:grid-cols-[92px_minmax(0,1fr)]">
            <select
              aria-label={`${label} regra`}
              value={condition.operator}
              onChange={(event) =>
                onChange({
                  ...condition,
                  operator: event.currentTarget.value as RoutingConditionOperator,
                  value: '',
                })
              }
              className={compactInput}
            >
              <option value="equals">=</option>
              <option value="notEquals">!=</option>
              <option value="contains">contem</option>
              <option value="exists">preenchido</option>
            </select>

            {showValue ? (
              <ConditionValueInput
                ariaLabel={`${label} valor`}
                field={selectedSource}
                options={options}
                operator={condition.operator}
                value={condition.value}
                onChange={(value) => onChange({ ...condition, value })}
              />
            ) : (
              <input
                aria-label={`${label} valor`}
                value="sim"
                disabled
                className={compactInput}
              />
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TeamsList({
  teams,
  onDeleteTeam,
  onDeleteMember,
  onEditTeam,
  onToggleTeamStatus,
  onToggleMemberStatus,
  deletingTeamId,
  deletingMemberId,
}: {
  teams: CatalogAdminTeam[];
  onEditTeam: (team: CatalogAdminTeam) => void;
  onToggleTeamStatus: (team: CatalogAdminTeam) => void;
  onToggleMemberStatus: (
    member: CatalogAdminTeam['members'][number],
    teamId: string,
  ) => void;
  onDeleteTeam: (team: CatalogAdminTeam) => void;
  onDeleteMember: (memberId: string) => void;
  deletingTeamId?: string;
  deletingMemberId?: string;
}) {
  return (
    <SectionCard className="overflow-hidden rounded-[6px] border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-0 text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)] backdrop-blur-[2px]">
      <div className="divide-y divide-[var(--admin-border)]">
        {teams.map((team) => (
          <div key={team.id} className="px-3 py-2 transition hover:bg-[var(--admin-surface-2)]">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_184px] sm:items-center">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-[12.5px] font-semibold">{team.name}</p>
                  <StatusPill label={team.status === 'ACTIVE' ? 'ativa' : 'inativa'} tone="neutral" />
                </div>
                <p className="mt-0.5 truncate text-[10.5px] text-[var(--admin-text-muted)]">
                  {team.code} • {team.department?.name ?? 'Sem setor'} • {team.members.length} atendentes
                </p>
              </div>
              <div className={adminActionCellClass}>
                <button
                  type="button"
                  onClick={() => onEditTeam(team)}
                  className={ghostButton}
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => onToggleTeamStatus(team)}
                  className={ghostButton}
                >
                  {team.status === 'ACTIVE' ? 'Inativar' : 'Ativar'}
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteTeam(team)}
                  disabled={deletingTeamId === team.id}
                  className={dangerButton}
                >
                  Excluir
                </button>
              </div>
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {team.members.slice(0, 4).map((member) => (
                <span
                  key={member.id}
                  className="inline-grid grid-cols-[minmax(70px,1fr)_44px_48px] items-center gap-1 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2 py-0.5 text-[10px] text-[var(--admin-text-secondary)]"
                >
                  <span className="truncate">{member.user.name}</span>
                  <button
                    type="button"
                    onClick={() => onToggleMemberStatus(member, team.id)}
                    className="text-center text-[9px] font-semibold text-[var(--admin-text-primary)] hover:text-white disabled:opacity-50"
                  >
                    {member.status === 'ACTIVE' ? 'off' : 'on'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteMember(member.id)}
                    disabled={deletingMemberId === member.id}
                    className="text-center text-[9px] font-semibold text-[rgba(255,210,210,0.95)] hover:text-white disabled:opacity-50"
                  >
                    remover
                  </button>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function FormsTab({
  topics,
  selectedTopicId,
  selectedTopic,
  onSelectTopic,
  onRefresh,
}: {
  topics: Array<Awaited<ReturnType<typeof listSupportCatalogAdmin>>['departments'][number]['topics'][number] & {
    department: Awaited<ReturnType<typeof listSupportCatalogAdmin>>['departments'][number];
  }>;
  selectedTopicId: string;
  selectedTopic?: Array<Awaited<ReturnType<typeof listSupportCatalogAdmin>>['departments'][number]['topics'][number] & {
    department: Awaited<ReturnType<typeof listSupportCatalogAdmin>>['departments'][number];
  }>[number];
  onSelectTopic: (id: string) => void;
  onRefresh: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<DraftField[]>([emptyDraftField()]);
  const formMutation = useMutation({
    mutationFn: createSupportTopicForm,
    onSuccess: () => {
      setTitle('');
      setDescription('');
      setFields([emptyDraftField()]);
      onRefresh();
    },
  });

  const latestForm = selectedTopic?.forms[0] ?? null;
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedTopicId) {
      return;
    }

    formMutation.mutate({
      topicId: selectedTopicId,
      title,
      description,
      status: 'ACTIVE',
      fields: fields
        .filter((field) => field.code.trim() && field.label.trim())
        .map((field, index) => ({
          code: field.code,
          label: field.label,
          type: field.type,
          required: field.required,
          sensitive: field.sensitive,
          helpText: field.helpText,
          options: field.optionsText
            .split(',')
            .map((option) => option.trim())
            .filter(Boolean),
          visibleWhen: buildFieldCondition(field.visibleWhen),
          requiredWhen: buildFieldCondition(field.requiredWhen),
          sortOrder: index + 1,
        })),
    });
  };

  return (
    <section className="grid gap-2 lg:grid-cols-[minmax(240px,0.7fr)_minmax(0,1.3fr)]">
      <SectionCard className="overflow-hidden rounded-[6px] border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-0 text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)] backdrop-blur-[2px]">
        <div className="divide-y divide-[var(--admin-border)]">
          {topics.map((topic) => (
            <button
              key={topic.id}
              type="button"
              onClick={() => onSelectTopic(topic.id)}
              className={cn(
                'w-full px-3 py-2 text-left transition hover:bg-[var(--admin-surface-2)]',
                selectedTopicId === topic.id ? 'bg-[var(--admin-panel-active)]' : '',
              )}
            >
              <p className="truncate text-[12.5px] font-semibold">{topic.name}</p>
              <p className="mt-0.5 truncate text-[10.5px] text-[var(--admin-text-muted)]">
                {topic.department.name} • {topic.forms.length} versoes
              </p>
            </button>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
        <SectionCard className="rounded-[6px] border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-3 text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)] backdrop-blur-[2px]">
          <form onSubmit={handleSubmit} className="grid gap-2">
            <PanelTitle icon={<ClipboardList size={14} />} title={selectedTopic ? `Formulario para ${selectedTopic.name}` : 'Formulario'} />
            <SmallFields>
              <Field label="Titulo">
                <input
                  value={title}
                  onChange={(event) => setTitle(event.currentTarget.value)}
                  placeholder="Solicitacao de ferias"
                  className={compactInput}
                />
              </Field>
              <Field label="Descricao">
                <input
                  value={description}
                  onChange={(event) => setDescription(event.currentTarget.value)}
                  placeholder="Opcional"
                  className={compactInput}
                />
              </Field>
            </SmallFields>

            <div className="grid gap-1.5">
              {fields.map((field, index) => (
                <div key={index} className="grid gap-1.5 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-2">
                  <SmallFields>
                    <Field label="Codigo">
                      <input
                        value={field.code}
                        onChange={(event) => updateField(fields, setFields, index, { code: event.currentTarget.value })}
                        placeholder="startDate"
                        className={compactInput}
                      />
                    </Field>
                    <Field label="Rotulo">
                      <input
                        value={field.label}
                        onChange={(event) => updateField(fields, setFields, index, { label: event.currentTarget.value })}
                        placeholder="Data inicial"
                        className={compactInput}
                      />
                    </Field>
                  </SmallFields>
                  <div className="grid gap-1.5 sm:grid-cols-[minmax(0,0.8fr)_auto_auto] sm:items-end">
                    <Field label="Tipo">
                      <select
                        value={field.type}
                        onChange={(event) =>
                          updateField(fields, setFields, index, {
                            type: event.currentTarget.value as SupportFormFieldType,
                          })
                        }
                        className={compactInput}
                      >
                        {fieldTypes.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </Field>
                    <CheckField
                      label="Obrigatorio"
                      checked={field.required}
                      onChange={(required) => updateField(fields, setFields, index, { required })}
                    />
                    <CheckField
                      label="Sensivel"
                      checked={field.sensitive}
                      onChange={(sensitive) => updateField(fields, setFields, index, { sensitive })}
                    />
                  </div>
                  <SmallFields>
                    <Field label="Ajuda">
                      <input
                        value={field.helpText}
                        onChange={(event) => updateField(fields, setFields, index, { helpText: event.currentTarget.value })}
                        placeholder="Orientacao curta"
                        className={compactInput}
                      />
                    </Field>
                    <Field label="Opcoes">
                      <input
                        value={field.optionsText}
                        onChange={(event) => updateField(fields, setFields, index, { optionsText: event.currentTarget.value })}
                        placeholder="Opcao A, Opcao B"
                        className={compactInput}
                      />
                    </Field>
                  </SmallFields>
                  <SmallFields>
                    <FieldConditionEditor
                      label="Mostrar se"
                      sources={fields.slice(0, index)}
                      condition={field.visibleWhen}
                      onChange={(visibleWhen) =>
                        updateField(fields, setFields, index, { visibleWhen })
                      }
                    />
                    <FieldConditionEditor
                      label="Obrigatorio se"
                      sources={fields.slice(0, index)}
                      condition={field.requiredWhen}
                      onChange={(requiredWhen) =>
                        updateField(fields, setFields, index, { requiredWhen })
                      }
                    />
                  </SmallFields>
                </div>
              ))}
            </div>

            <div className="grid gap-1.5 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setFields((current) => [...current, emptyDraftField()])}
                className={compactButton}
              >
                <Plus size={13} />
                Campo
              </button>
              <SubmitButton pending={formMutation.isPending} label="Publicar versao" />
            </div>
            <MutationError mutation={formMutation} />
          </form>
        </SectionCard>

        <SectionCard className="rounded-[6px] border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-3 text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)] backdrop-blur-[2px]">
          <PanelTitle icon={<Settings2 size={14} />} title="Versao atual" />
          {latestForm ? (
            <div className="mt-2 grid gap-1.5">
              <div className="rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2.5 py-2">
                <p className="text-[12px] font-semibold">{latestForm.title}</p>
                <p className="mt-0.5 text-[10.5px] text-[var(--admin-text-muted)]">
                  v{latestForm.version} • {latestForm.fields.length} campos
                </p>
              </div>
              {latestForm.fields.map((field) => (
                <div key={field.id} className="rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2.5 py-1.5">
                  <p className="truncate text-[11.5px] font-semibold">{field.label}</p>
                  <p className="truncate text-[10.5px] text-[var(--admin-text-muted)]">
                    {field.code} • {field.type}
                    {field.sensitive ? ' • sensivel' : ''}
                    {field.visibleWhen ? ' • visibilidade cond.' : ''}
                    {field.requiredWhen ? ' • obrigatoriedade cond.' : ''}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[12px] text-[var(--admin-text-secondary)]">
              Este assunto ainda nao tem formulario.
            </p>
          )}
        </SectionCard>
      </div>
    </section>
  );
}

function PanelTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-[12.5px] font-semibold">
      <span className="flex h-7 w-7 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)]">
        {icon}
      </span>
      <span className="truncate">{title}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid min-w-0 gap-1">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-2">{children}</div>;
}

function SmallFields({ children }: { children: ReactNode }) {
  return <div className="grid gap-1.5 sm:grid-cols-2">{children}</div>;
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        min={0}
        max={999}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        className={compactInput}
      />
    </Field>
  );
}

function PriorityField({
  value,
  onChange,
}: {
  value: SupportCasePriority;
  onChange: (value: SupportCasePriority) => void;
}) {
  return (
    <Field label="Prioridade">
      <select
        value={value}
        onChange={(event) => onChange(event.currentTarget.value as SupportCasePriority)}
        className={compactInput}
      >
        <option value="LOW">Baixa</option>
        <option value="NORMAL">Normal</option>
        <option value="HIGH">Alta</option>
        <option value="URGENT">Urgente</option>
      </select>
    </Field>
  );
}

function StatusField({
  value,
  onChange,
}: {
  value: CatalogStatus;
  onChange: (value: CatalogStatus) => void;
}) {
  return (
    <Field label="Status">
      <select
        value={value}
        onChange={(event) => onChange(event.currentTarget.value as CatalogStatus)}
        className={compactInput}
      >
        <option value="ACTIVE">Ativo</option>
        <option value="INACTIVE">Inativo</option>
      </select>
    </Field>
  );
}

function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex h-8 items-center gap-2 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2 text-[11px] font-semibold text-[var(--admin-text-secondary)]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
      {label}
    </label>
  );
}

function SubmitButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button type="submit" disabled={pending} className={primaryButton}>
      {pending ? 'Salvando...' : label}
    </button>
  );
}

function MutationError({ mutation }: { mutation: { isError: boolean; error: Error | null } }) {
  if (!mutation.isError) {
    return null;
  }

  return <p className="text-[11px] text-[var(--admin-danger-text)]">{mutation.error?.message}</p>;
}

function objectConditionsOrUndefined(conditions: unknown) {
  if (!conditions || typeof conditions !== 'object' || Array.isArray(conditions)) {
    return undefined;
  }

  return conditions as Record<string, unknown>;
}

function buildRoutingConditions(
  mode: RoutingConditionMode,
  drafts: RoutingConditionDraft[],
):
  | { status: 'VALID'; value?: Record<string, unknown> }
  | { status: 'INVALID'; message: string } {
  const conditions = drafts.filter((condition) => condition.fieldCode);

  if (conditions.length === 0) {
    return { status: 'VALID' };
  }

  const missingValue = conditions.find(
    (condition) => condition.operator !== 'exists' && !condition.value.trim(),
  );

  if (missingValue) {
    return {
      status: 'INVALID',
      message: 'Informe o valor das condicoes ou remova a linha incompleta.',
    };
  }

  return {
    status: 'VALID',
    value: {
      [mode]: conditions.map((condition) => ({
        fieldCode: condition.fieldCode,
        operator: condition.operator,
        ...conditionValuePayload(condition),
      })),
    },
  };
}

function conditionValuePayload(condition: RoutingConditionDraft) {
  if (condition.operator === 'exists') {
    return {};
  }

  if (condition.operator === 'in') {
    return {
      values: condition.value
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    };
  }

  return { value: condition.value.trim() };
}

function conditionDraftsFromRule(conditions: unknown): {
  conditionMode: RoutingConditionMode;
  conditions: RoutingConditionDraft[];
} {
  const parsed = objectConditionsOrUndefined(conditions);

  if (!parsed) {
    return { conditionMode: 'all', conditions: [] };
  }

  const mode: RoutingConditionMode = Array.isArray(parsed.any) ? 'any' : 'all';
  const source = Array.isArray(parsed[mode]) ? parsed[mode] : [];

  return {
    conditionMode: mode,
    conditions: source
      .map((condition) => conditionDraftFromUnknown(condition))
      .filter((condition): condition is RoutingConditionDraft => Boolean(condition)),
  };
}

function conditionDraftFromUnknown(condition: unknown): RoutingConditionDraft | null {
  if (!condition || typeof condition !== 'object' || Array.isArray(condition)) {
    return null;
  }

  const record = condition as Record<string, unknown>;
  const fieldCode = typeof record.fieldCode === 'string' ? record.fieldCode : '';
  const operator = routingOperatorFromUnknown(record.operator);
  const value = Array.isArray(record.values)
    ? record.values.join(', ')
    : String(record.value ?? '');

  return {
    id: newConditionDraftId(),
    fieldCode,
    operator,
    value,
  };
}

function newConditionDraftId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `condition-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function routingOperatorFromUnknown(operator: unknown): RoutingConditionOperator {
  if (
    operator === 'equals' ||
    operator === 'notEquals' ||
    operator === 'in' ||
    operator === 'contains' ||
    operator === 'exists'
  ) {
    return operator;
  }

  return 'equals';
}

function fieldValueOptions(field?: ConditionValueField) {
  if (!Array.isArray(field?.options)) {
    return [];
  }

  return field.options
    .filter((option): option is string => typeof option === 'string')
    .filter((option) => option.trim().length > 0);
}

function draftFieldOptions(field?: DraftField) {
  if (!field) {
    return [];
  }

  return field.optionsText
    .split(',')
    .map((option) => option.trim())
    .filter((option) => option.length > 0);
}

function routingConditionSummary(conditions: unknown) {
  const drafts = conditionDraftsFromRule(conditions);

  if (drafts.conditions.length === 0) {
    return 'padrao';
  }

  return `${drafts.conditions.length} cond. ${drafts.conditionMode === 'all' ? 'todas' : 'qualquer'}`;
}

function emptyDraftField(): DraftField {
  return {
    code: '',
    label: '',
    type: 'TEXT',
    required: false,
    sensitive: false,
    helpText: '',
    optionsText: '',
    visibleWhen: emptyFieldCondition(),
    requiredWhen: emptyFieldCondition(),
  };
}

function emptyFieldCondition(): FieldConditionDraft {
  return {
    sourceCode: '',
    operator: 'equals',
    value: '',
  };
}

function buildFieldCondition(condition: FieldConditionDraft) {
  const fieldCode = condition.sourceCode.trim();
  const value = condition.value.trim();

  if (!fieldCode) {
    return undefined;
  }

  if (condition.operator !== 'exists' && !value) {
    return undefined;
  }

  return {
    all: [
      {
        fieldCode,
        operator: condition.operator,
        ...(condition.operator === 'exists' ? {} : { value }),
      },
    ],
  };
}

function updateField(
  fields: DraftField[],
  setFields: Dispatch<SetStateAction<DraftField[]>>,
  index: number,
  patch: Partial<DraftField>,
) {
  setFields(
    fields.map((field, fieldIndex) =>
      fieldIndex === index ? { ...field, ...patch } : field,
    ),
  );
}

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}
