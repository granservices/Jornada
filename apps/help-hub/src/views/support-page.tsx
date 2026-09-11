import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  CheckCircle2,
  MessageSquarePlus,
  Plus,
  Search,
  Send,
  Star,
  TicketCheck,
} from 'lucide-react';
import { SectionCard } from '../components/ui/section-card';
import { StatusPill } from '../components/ui/status-pill';
import { useAuthSession } from '@jornada/frontend-core/auth';
import { cn } from '../lib/cn';
import { queryOptionSource } from '../features/forms/forms-api';
import {
  addSupportCaseMessage,
  createSupportCase,
  getSupportCase,
  listSupportCases,
  listSupportCatalog,
  listSupportCatalogAdmin,
  listSupportTeams,
  rateSupportCase,
  suggestSupportTriage,
  updateSupportCase,
  type SupportCaseFilter,
  type SupportCaseDetail,
  type SupportCaseListItem,
  type SupportCatalogAdminDepartment,
  type SupportOperatorQueueView,
  type SupportCasePriority,
  type SupportCaseStatus,
  type SupportDepartment,
  type SupportTeam,
  type SupportTopicField,
} from '../features/support/support-api';

const filterGridClass = 'grid min-w-0 grid-cols-2 gap-1.5 sm:flex sm:flex-wrap';
const filterButtonBaseClass =
  'inline-flex h-8 min-w-0 items-center justify-center gap-1 rounded-[4px] border px-1.5 text-[9.5px] font-semibold leading-none transition sm:w-[116px] sm:flex-none';
const filterButtonActiveClass =
  'border-[var(--admin-border-strong)] bg-[var(--admin-panel-active)] text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)]';
const filterButtonIdleClass =
  'border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-panel-active)] hover:text-[var(--admin-text-primary)]';
const searchFieldClass =
  'flex h-8 min-w-0 items-center gap-2 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2.5 text-[12px] text-[var(--admin-text-secondary)] transition focus-within:border-[var(--admin-border-strong)] focus-within:bg-[var(--admin-panel-active)]';
const dynamicFormInputClass =
  'h-8 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-2 text-[12px] text-[var(--admin-text-primary)] outline-none placeholder:text-[var(--admin-text-muted)]';

const statusLabels: Record<SupportCaseStatus, string> = {
  NEW: 'novo',
  OPEN: 'em atendimento',
  WAITING_REQUESTER: 'aguardando',
  WAITING_INTERNAL: 'interno',
  RESOLVED: 'resolvido',
  CLOSED: 'fechado',
};

const priorityLabels: Record<SupportCasePriority, string> = {
  LOW: 'baixa',
  NORMAL: 'normal',
  HIGH: 'alta',
  URGENT: 'urgente',
};

type SupportViewMode = 'list' | 'new' | 'detail';
type SupportMobilePanel = 'conversation' | 'manage';
type DynamicFormValue = string | boolean;
type DynamicFormValues = Record<string, DynamicFormValue>;
type DynamicFormErrors = Record<string, string>;

function statusTone(status: SupportCaseStatus) {
  if (status === 'RESOLVED' || status === 'CLOSED') {
    return 'neutral' as const;
  }

  if (status === 'WAITING_REQUESTER' || status === 'WAITING_INTERNAL') {
    return 'warning' as const;
  }

  return 'critical' as const;
}

function parseSupportViewMode(searchParams: URLSearchParams): SupportViewMode {
  const mode = searchParams.get('modo');

  if (mode === 'new' || mode === 'detail' || mode === 'list') {
    return mode;
  }

  return searchParams.get('caso') ? 'detail' : 'list';
}

function parseSupportMobilePanel(
  searchParams: URLSearchParams,
  isSupportUser: boolean,
): SupportMobilePanel {
  if (!isSupportUser) {
    return 'conversation';
  }

  return searchParams.get('aba') === 'gestao' ? 'manage' : 'conversation';
}

function parseSupportOperatorQueueView(searchParams: URLSearchParams): SupportOperatorQueueView {
  const queueView = searchParams.get('fila');

  if (
    queueView === 'novos-e-meus' ||
    queueView === 'nao-atribuidos' ||
    queueView === 'meus-atendimentos' ||
    queueView === 'aguardando' ||
    queueView === 'alta-prioridade' ||
    queueView === 'resolvidos'
  ) {
    return queueView;
  }

  return 'nao-atribuidos';
}

function supportDepartmentsForEmployee(
  publicDepartments: SupportDepartment[],
  adminDepartments: SupportCatalogAdminDepartment[] = [],
) {
  if (publicDepartments.length > 0) {
    return publicDepartments;
  }

  return adminDepartments
    .filter((department) => department.status !== 'INACTIVE')
    .map((department) => ({
      id: department.id,
      code: department.code,
      name: department.name,
      description: department.description,
      status: department.status,
      sortOrder: department.sortOrder,
      topics: department.topics
        .filter((topic) => topic.status !== 'INACTIVE')
        .map((topic) => ({
          id: topic.id,
          code: topic.code,
          name: topic.name,
          description: topic.description,
          defaultPriority: topic.defaultPriority,
          form: topic.forms.find((form) => form.status !== 'INACTIVE') ?? null,
        })),
    }));
}

export function SupportPage() {
  const queryClient = useQueryClient();
  const session = useAuthSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const viewMode = parseSupportViewMode(searchParams);
  const [activeFilter, setActiveFilter] = useState<SupportCaseFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const selectedId = searchParams.get('caso');
  const [optimisticSelectedCase, setOptimisticSelectedCase] =
    useState<SupportCaseDetail | null>(null);
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [priority, setPriority] = useState<SupportCasePriority>('NORMAL');
  const [formValues, setFormValues] = useState<DynamicFormValues>({});
  const [formErrors, setFormErrors] = useState<DynamicFormErrors>({});
  const [messageDraft, setMessageDraft] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [workspaceContextOpen, setWorkspaceContextOpen] = useState(false);
  const isSupportUser = Boolean(
    session?.user.roles.some((role) =>
      ['ADMIN', 'SUPPORT', 'TI', 'MEDICINE', 'OPERATIONS'].includes(role),
    ),
  );
  const mobilePanel = parseSupportMobilePanel(searchParams, isSupportUser);
  const operatorQueueView = parseSupportOperatorQueueView(searchParams);

  const updateSupportRoute = ({
    mode,
    caseId,
    panel,
    replace = false,
  }: {
    mode: SupportViewMode;
    caseId?: string | null;
    panel?: SupportMobilePanel;
    replace?: boolean;
  }) => {
    const nextParams = new URLSearchParams(searchParams);

    nextParams.set('modo', mode);

    if (caseId) {
      nextParams.set('caso', caseId);
    } else {
      nextParams.delete('caso');
    }

    if (mode === 'detail' && panel && isSupportUser) {
      nextParams.set('aba', panel === 'manage' ? 'gestao' : 'conversa');
      nextParams.set('dock', '1');
    } else {
      nextParams.delete('aba');
      nextParams.delete('dock');
    }

    setSearchParams(nextParams, { replace });
  };

  const teamsQuery = useQuery({
    queryKey: ['support', 'teams'],
    queryFn: listSupportTeams,
  });
  const catalogQuery = useQuery({
    queryKey: ['support', 'catalog'],
    queryFn: listSupportCatalog,
  });
  const catalogAdminQuery = useQuery({
    queryKey: ['support', 'catalog', 'admin', 'employee-fallback'],
    queryFn: listSupportCatalogAdmin,
    enabled: isSupportUser && catalogQuery.isSuccess && (catalogQuery.data?.items.length ?? 0) === 0,
  });
  const allCasesQuery = useQuery({
    queryKey: ['support', 'cases', 'summary', isSupportUser ? 'operator' : activeFilter, searchTerm],
    queryFn: () =>
      listSupportCases({
        filter: isSupportUser ? 'all' : activeFilter,
        q: searchTerm,
      }),
  });
  const queueCasesQuery = useQuery({
    queryKey: ['support', 'cases', 'queue', operatorQueueView, searchTerm],
    queryFn: () =>
      listSupportCases({
        filter: 'all',
        q: searchTerm,
        queue: operatorQueueView,
      }),
    enabled: isSupportUser,
  });
  const allCases = allCasesQuery.data?.items ?? [];
  const cases = isSupportUser
    ? queueCasesQuery.data?.items ?? []
    : allCases;
  const departments = useMemo(
    () => supportDepartmentsForEmployee(
      catalogQuery.data?.items ?? [],
      catalogAdminQuery.data?.departments ?? [],
    ),
    [catalogAdminQuery.data?.departments, catalogQuery.data?.items],
  );
  const selectedDepartment =
    departments.find((department) => department.id === departmentId) ?? null;
  const availableTopics = selectedDepartment?.topics ?? [];
  const selectedTopic =
    availableTopics.find((topic) => topic.id === topicId) ?? null;
  const activeForm = selectedTopic?.form ?? null;
  const resetDynamicForm = () => {
    setFormValues({});
    setFormErrors({});
  };
  const selectedSummary = selectedId
    ? cases.find((supportCase) => supportCase.id === selectedId) ??
      (optimisticSelectedCase?.id === selectedId ? optimisticSelectedCase : null) ??
      null
    : optimisticSelectedCase ?? cases[0] ?? null;
  const selectedCaseId = selectedId ?? selectedSummary?.id ?? null;
  const detailQuery = useQuery({
    queryKey: ['support', 'cases', selectedCaseId, 'detail'],
    queryFn: () => getSupportCase(selectedCaseId as string),
    enabled: Boolean(selectedCaseId),
  });
  const selectedCase = detailQuery.data?.item ?? selectedSummary;
  const selectedCaseEvents: SupportCaseDetail['events'] =
    detailQuery.data?.item.events ?? [];
  const selectedCaseMessages: SupportCaseDetail['messages'] =
    detailQuery.data?.item.messages ?? [];
  const selectedCaseFieldValues: SupportCaseDetail['fieldValues'] =
    detailQuery.data?.item.fieldValues ?? [];
  const filters = useMemo(
    () => [
      { id: 'all' as const, label: 'Todos', value: cases.length },
      { id: 'open' as const, label: 'Abertos', value: cases.filter((item) => ['NEW', 'OPEN'].includes(item.status)).length },
      { id: 'waiting' as const, label: 'Aguardando', value: cases.filter((item) => item.status === 'WAITING_REQUESTER').length },
      { id: 'resolved' as const, label: 'Resolvidos', value: cases.filter((item) => item.status === 'RESOLVED').length },
    ],
    [cases],
  );

  useEffect(() => {
    if (departmentId || departments.length === 0) {
      return;
    }

    setDepartmentId(departments[0].id);
  }, [departmentId, departments]);

  useEffect(() => {
    if (!selectedDepartment) {
      return;
    }

    const topicStillAvailable = selectedDepartment.topics.some(
      (topic) => topic.id === topicId,
    );

    if (topicStillAvailable) {
      return;
    }

    const nextTopic = selectedDepartment.topics[0] ?? null;
    setTopicId(nextTopic?.id ?? '');
    setPriority(nextTopic?.defaultPriority ?? 'NORMAL');
  }, [selectedDepartment, topicId]);

  useEffect(() => {
    setWorkspaceContextOpen(mobilePanel === 'manage');
  }, [mobilePanel, selectedCaseId]);

  const createMutation = useMutation({
    mutationFn: createSupportCase,
    onSuccess: (result) => {
      setDescription('');
      resetDynamicForm();
      setPriority('NORMAL');
      setOptimisticSelectedCase(result.item);
      updateSupportRoute({
        mode: 'detail',
        caseId: result.item.id,
        panel: 'conversation',
      });
      void queryClient.invalidateQueries({ queryKey: ['support', 'cases'] });
      void queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
  });
  const triageMutation = useMutation({
    mutationFn: suggestSupportTriage,
    onSuccess: (result) => {
      if (!result.suggestion) {
        return;
      }

      setDepartmentId(result.suggestion.department.id);
      setTopicId(result.suggestion.topic.id);
      const nextDepartment = departments.find(
        (department) => department.id === result.suggestion?.department.id,
      );
      const nextTopic = nextDepartment?.topics.find(
        (topic) => topic.id === result.suggestion?.topic.id,
      );
      setPriority(nextTopic?.defaultPriority ?? 'NORMAL');
      resetDynamicForm();
    },
  });

  const ratingMutation = useMutation({
    mutationFn: rateSupportCase,
    onSuccess: () => {
      setRatingComment('');
      void queryClient.invalidateQueries({ queryKey: ['support', 'cases'] });
    },
  });
  const messageMutation = useMutation({
    mutationFn: addSupportCaseMessage,
    onSuccess: (_, variables) => {
      setMessageDraft('');
      void queryClient.invalidateQueries({ queryKey: ['support', 'cases'] });
      void queryClient.invalidateQueries({
        queryKey: ['support', 'cases', variables.supportCaseId, 'detail'],
      });
      void queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
  });
  const updateMutation = useMutation({
    mutationFn: updateSupportCase,
    onSuccess: (_, variables) => {
      setActionReason('');
      void queryClient.invalidateQueries({ queryKey: ['support', 'cases'] });
      void queryClient.invalidateQueries({
        queryKey: ['support', 'cases', variables.supportCaseId, 'detail'],
      });
    },
  });

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedDepartment) {
      return;
    }

    const nextFormErrors = activeForm
      ? validateDynamicSupportForm(activeForm.fields, formValues)
      : {};
    setFormErrors(nextFormErrors);

    if (Object.keys(nextFormErrors).length > 0) {
      return;
    }

    createMutation.mutate({
      departmentId: selectedDepartment.id,
      topicId: selectedTopic?.id,
      title: selectedTopic?.name ?? `Atendimento - ${selectedDepartment.name}`,
      description,
      priority,
      fieldValues: formValuesPayload(activeForm?.fields ?? [], formValues),
    });
  };

  const handleRate = (supportCase: SupportCaseListItem) => {
    ratingMutation.mutate({
      supportCaseId: supportCase.id,
      score: ratingScore,
      comment: ratingComment,
    });
  };
  const handleAddMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedCase || !messageDraft.trim()) {
      return;
    }

    messageMutation.mutate({
      supportCaseId: selectedCase.id,
      body: messageDraft,
    });
  };
  const handleStatusUpdate = (status: SupportCaseStatus) => {
    if (!selectedCase) {
      return;
    }

    updateMutation.mutate({
      supportCaseId: selectedCase.id,
      status,
      changeReason: actionReason,
    });
  };
  const handleAssignToMe = () => {
    if (!selectedCase || !session?.user.id) {
      return;
    }

    updateMutation.mutate({
      supportCaseId: selectedCase.id,
      assignedUserId: session.user.id,
    });
  };
  const handleReturnToQueue = () => {
    if (!selectedCase) {
      return;
    }

    updateMutation.mutate({
      supportCaseId: selectedCase.id,
      assignedUserId: '',
      changeReason: actionReason,
    });
  };
  const handleTeamTransfer = (nextTeamCode: string) => {
    if (!selectedCase || !nextTeamCode || nextTeamCode === selectedCase.teamCode) {
      return;
    }

    updateMutation.mutate({
      supportCaseId: selectedCase.id,
      teamCode: nextTeamCode,
      assignedUserId: '',
      changeReason: actionReason,
    });
  };
  const openSupportCaseDetail = (
    supportCaseId: string,
    panel: SupportMobilePanel = 'conversation',
  ) => {
    setOptimisticSelectedCase(null);
    updateSupportRoute({
      mode: 'detail',
      caseId: supportCaseId,
      panel,
    });
  };
  const setOperatorQueueFilter = (queueView: SupportOperatorQueueView) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('fila', queueView);
    nextParams.set('modo', 'list');
    nextParams.delete('caso');
    nextParams.delete('aba');
    nextParams.delete('dock');
    setSearchParams(nextParams);
  };
  const sensitiveActionNeedsReason = actionReason.trim().length < 4;
  const showDesktopSupportWorkspace =
    isSupportUser && viewMode === 'detail' && Boolean(selectedCase);
  const showConversationPanel =
    !isSupportUser || showDesktopSupportWorkspace || mobilePanel === 'conversation';
  const showDesktopManagementPanel =
    isSupportUser && showDesktopSupportWorkspace && workspaceContextOpen;
  const showMobileManagementPanel = isSupportUser && mobilePanel === 'manage';
  const teams = teamsQuery.data?.items ?? [];
  const selectedCaseIndex = selectedCase
    ? cases.findIndex((supportCase) => supportCase.id === selectedCase.id)
    : -1;
  const previousCase =
    selectedCaseIndex > 0 ? cases[selectedCaseIndex - 1] : null;
  const nextCase =
    selectedCaseIndex >= 0 && selectedCaseIndex < cases.length - 1
      ? cases[selectedCaseIndex + 1]
      : null;
  const queueHighlights = useMemo(
    () => [
      {
        label: 'Com voce',
        value: allCases.filter(
          (supportCase) =>
            supportCase.assignedUser?.id === session?.user.id &&
            supportCase.status !== 'RESOLVED' &&
            supportCase.status !== 'CLOSED',
        ).length,
      },
      {
        label: 'Sem responsavel',
        value: allCases.filter(
          (supportCase) =>
            !supportCase.assignedUser &&
            supportCase.status !== 'RESOLVED' &&
            supportCase.status !== 'CLOSED',
        ).length,
      },
      {
        label: 'Criticos',
        value: allCases.filter(
          (supportCase) =>
            ['HIGH', 'URGENT'].includes(supportCase.priority) &&
            supportCase.status !== 'RESOLVED' &&
            supportCase.status !== 'CLOSED',
        ).length,
      },
    ],
    [allCases, session?.user.id],
  );
  const operatorQueueViews = useMemo(
    () =>
      supportOperatorQueueDefinitions(allCases, session?.user.id ?? '').map((queueView) => ({
        ...queueView,
        active: operatorQueueView === queueView.id,
      })),
    [allCases, operatorQueueView, session?.user.id],
  );
  const listToolbarFilters = isSupportUser ? operatorQueueViews : filters;

  const operatorQueuesCard = isSupportUser ? (
    <SectionCard className="flex min-h-[360px] flex-col overflow-hidden rounded-[6px] border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-0 text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)] backdrop-blur-[2px] lg:h-[calc(100vh-178px)] lg:min-h-0">
      <div className="border-b border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-text-muted)]">
          Filas
        </p>
        <p className="mt-1 text-[12px] font-semibold text-[var(--admin-text-primary)]">
          Operacao por backlog e responsavel
        </p>
      </div>
      <div className="admin-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
        <div className="grid gap-1.5">
          {operatorQueueViews.map((queueView) => (
            <button
              key={queueView.id}
              type="button"
              onClick={() => setOperatorQueueFilter(queueView.id)}
              aria-pressed={queueView.active}
              className={cn(
                'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-[5px] border px-2.5 py-2 text-left transition',
                queueView.active
                  ? 'border-[var(--admin-border-strong)] bg-[var(--admin-panel-active)] text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)]'
                  : 'border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-panel-active)] hover:text-[var(--admin-text-primary)]',
              )}
            >
              <span className="min-w-0">
                <span className="block truncate text-[11px] font-semibold">{queueView.label}</span>
                <span className="mt-0.5 block truncate text-[10px] text-current/70">
                  {queueView.description}
                </span>
              </span>
              <span className="inline-flex min-w-7 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--admin-text-primary)]">
                {queueView.count}
              </span>
            </button>
          ))}
        </div>
      </div>
    </SectionCard>
  ) : null;

  const casesListCard = (
    <SectionCard
      className={cn(
        'flex min-h-[360px] min-w-0 flex-col overflow-hidden rounded-[6px] border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-0 text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)] backdrop-blur-[2px]',
        showDesktopSupportWorkspace
          ? 'lg:h-[calc(100vh-178px)] lg:min-h-0 lg:max-h-none'
          : 'max-h-[calc(100vh-178px)]',
      )}
    >
      <div className="hidden grid-cols-[30px_minmax(0,1fr)_120px] gap-2 border-b border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-text-muted)] sm:grid">
        <span />
        <span>Solicitacao</span>
        <span className="text-right">Atualizado</span>
      </div>
      {showDesktopSupportWorkspace ? (
        <div className="hidden border-b border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-2 lg:block">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-text-muted)]">
                {queueViewLabel(operatorQueueView)}
              </p>
              <p className="truncate text-[12px] font-semibold text-[var(--admin-text-primary)]">
                Navegue pela fila sem perder o contexto do atendimento.
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => previousCase && openSupportCaseDetail(previousCase.id)}
                disabled={!previousCase}
                className="inline-flex h-7 shrink-0 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-2 text-[10px] font-semibold text-[var(--admin-text-secondary)] transition hover:bg-[var(--admin-panel-active)] hover:text-[var(--admin-text-primary)] disabled:opacity-45"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => nextCase && openSupportCaseDetail(nextCase.id)}
                disabled={!nextCase}
                className="inline-flex h-7 shrink-0 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-2 text-[10px] font-semibold text-[var(--admin-text-secondary)] transition hover:bg-[var(--admin-panel-active)] hover:text-[var(--admin-text-primary)] disabled:opacity-45"
              >
                Proximo
              </button>
              <button
                type="button"
                onClick={() => updateSupportRoute({ mode: 'new' })}
                className="inline-flex h-7 shrink-0 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-2 text-[10px] font-semibold text-[var(--admin-text-secondary)] transition hover:bg-[var(--admin-panel-active)] hover:text-[var(--admin-text-primary)]"
              >
                Novo
              </button>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {queueHighlights.map((highlight) => (
              <QueueStatChip
                key={highlight.label}
                label={highlight.label}
                value={highlight.value}
              />
            ))}
          </div>
        </div>
      ) : null}
      <div className="admin-scrollbar min-h-0 flex-1 divide-y divide-[var(--admin-border)] overflow-y-auto">
        {cases.length > 0 ? cases.map((supportCase) => (
          <button
            key={supportCase.id}
            type="button"
            onClick={() => openSupportCaseDetail(supportCase.id)}
            className={cn(
              'grid w-full grid-cols-[30px_minmax(0,1fr)_auto] gap-2 px-2.5 py-2 text-left transition hover:bg-[var(--admin-surface-2)] sm:px-3',
              selectedCase?.id === supportCase.id ? 'bg-[var(--admin-panel-active)]' : 'bg-transparent',
            )}
          >
            <span className="mt-0.5 flex h-7.5 w-7.5 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)]">
              <TicketCheck size={14} />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-[12.5px] font-semibold">{supportCase.title}</span>
                <StatusPill label={statusLabels[supportCase.status]} tone={statusTone(supportCase.status)} />
              </span>
              <span className="mt-0.5 block truncate text-[12px] text-[var(--admin-text-secondary)]">
                {supportCase.description ?? 'Sem detalhe informado'}
              </span>
              <span className="mt-0.5 block text-[10.5px] text-[var(--admin-text-muted)]">
                {supportCase.code} • {supportCase.teamName} • {priorityLabels[supportCase.priority]}
              </span>
              {isSupportUser ? (
                <span className="mt-1 flex flex-wrap gap-1">
                  <span className="inline-flex h-5 items-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-1.5 text-[9.5px] font-semibold text-[var(--admin-text-secondary)]">
                    {supportCase.assignedUser?.id === session?.user.id
                      ? 'Com voce'
                      : supportCase.assignedUser
                        ? supportCase.assignedUser.name
                        : 'Sem responsavel'}
                  </span>
                  {supportCase.priority === 'HIGH' || supportCase.priority === 'URGENT' ? (
                    <span className="inline-flex h-5 items-center rounded-[4px] border border-[rgba(239,68,68,0.35)] bg-[rgba(123,22,32,0.24)] px-1.5 text-[9.5px] font-semibold text-[var(--admin-text-primary)]">
                      Prioridade {priorityLabels[supportCase.priority]}
                    </span>
                  ) : null}
                </span>
              ) : null}
            </span>
            <span className="pt-0.5 text-right text-[10.5px] text-[var(--admin-text-muted)]">{formatDate(supportCase.updatedAt)}</span>
          </button>
        )) : (
          <div className="px-3 py-8 text-center">
            <p className="text-[12.5px] font-semibold">
              {allCasesQuery.isLoading || queueCasesQuery.isLoading
                ? 'Carregando atendimentos'
                : 'Nenhum atendimento encontrado'}
            </p>
            <p className="mt-1 text-[12px] text-[var(--admin-text-secondary)]">
              Abra uma demanda ou ajuste a busca.
            </p>
          </div>
        )}
      </div>
    </SectionCard>
  );

  const selectedCaseDetailCard = viewMode === 'detail' && selectedCase ? (
    <SectionCard
      className={cn(
        'flex min-w-0 flex-col overflow-x-hidden overflow-y-hidden rounded-[6px] border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-0 text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)] backdrop-blur-[2px]',
        showDesktopSupportWorkspace
          ? 'h-[calc(100vh-178px)] min-h-0 border-[var(--admin-border-strong)]'
          : 'h-[calc(100svh-154px)] min-h-[430px] sm:h-[calc(100vh-178px)]',
      )}
    >
      <div
        className={cn(
          'grid min-h-0 flex-1 min-w-0',
          showDesktopManagementPanel ? 'lg:grid-cols-[minmax(0,1fr)_320px]' : 'lg:grid-cols-[minmax(0,1fr)]',
        )}
      >
        <div className="flex min-h-0 min-w-0 flex-col border-[var(--admin-border)] lg:border-r">
          <div className="grid min-h-12 gap-2 border-b border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2.5 py-2 sm:min-h-14 sm:px-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusPill label={selectedCase.code} tone="neutral" />
                <StatusPill label={statusLabels[selectedCase.status]} tone={statusTone(selectedCase.status)} />
                <StatusPill label={selectedCase.teamName} tone="neutral" />
              </div>
              <h2 className="mt-1 truncate text-[13px] font-semibold">{selectedCase.title}</h2>
              <p className="mt-1 truncate text-[10.5px] text-[var(--admin-text-muted)]">
                {selectedCase.requester.name} • atualizado em {formatDate(selectedCase.updatedAt)}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              {showDesktopSupportWorkspace ? (
                <>
                  <button
                    type="button"
                    onClick={() => setWorkspaceContextOpen((currentValue) => !currentValue)}
                    aria-label="Alternar contexto do atendimento"
                    aria-pressed={workspaceContextOpen}
                    className="hidden h-8 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-2 text-[10px] font-semibold text-[var(--admin-text-secondary)] transition hover:bg-[var(--admin-panel-active)] hover:text-[var(--admin-text-primary)] lg:inline-flex"
                  >
                    {workspaceContextOpen ? 'Contexto' : 'Ver contexto'}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSupportRoute({ mode: 'list' })}
                    className="hidden h-8 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-2 text-[10px] font-semibold text-[var(--admin-text-secondary)] transition hover:bg-[var(--admin-panel-active)] hover:text-[var(--admin-text-primary)] lg:inline-flex"
                  >
                    Fechar
                  </button>
                </>
              ) : null}
            </div>
          </div>

          <div className="border-b border-[var(--admin-border)] bg-[var(--admin-surface-1)] lg:hidden">
            {isSupportUser ? (
              <div className="grid grid-cols-2 gap-1 border-b border-[var(--admin-border)] p-1.5">
                <button
                  type="button"
                  onClick={() => updateSupportRoute({ mode: 'detail', caseId: selectedCase.id, panel: 'conversation' })}
                  className={cn(
                    'h-9 rounded-[4px] border px-2 text-[11px] font-semibold transition',
                    mobilePanel === 'conversation'
                      ? 'border-[var(--admin-border-strong)] bg-[var(--admin-panel-active)] text-[var(--admin-text-primary)]'
                      : 'border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)]',
                  )}
                >
                  Conversa
                </button>
                <button
                  type="button"
                  onClick={() => updateSupportRoute({ mode: 'detail', caseId: selectedCase.id, panel: 'manage' })}
                  className={cn(
                    'h-9 rounded-[4px] border px-2 text-[11px] font-semibold transition',
                    mobilePanel === 'manage'
                      ? 'border-[var(--admin-border-strong)] bg-[var(--admin-panel-active)] text-[var(--admin-text-primary)]'
                      : 'border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)]',
                  )}
                >
                  Gestao
                </button>
              </div>
            ) : (
              <details className="group">
                <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 px-2.5 text-[11px] font-semibold text-[var(--admin-text-secondary)] [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0 truncate">
                    {selectedCase.department?.name ?? 'Nao classificado'} • {selectedCase.topic?.name ?? 'Geral'}
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-[10.5px] text-[var(--admin-text-muted)]">
                    Detalhes
                    <ChevronDown size={13} className="transition group-open:rotate-180" />
                  </span>
                </summary>
                <div className="admin-scrollbar max-h-[32svh] overflow-y-auto border-t border-[var(--admin-border)] p-2">
                  <SupportCaseDetails
                    supportCase={selectedCase}
                    fieldValues={selectedCaseFieldValues}
                    isSupportUser={false}
                    teams={[]}
                    actionReason=""
                    ratingScore={ratingScore}
                    ratingComment={ratingComment}
                    updatePending={false}
                    updateError={null}
                    ratingPending={ratingMutation.isPending}
                    sensitiveActionNeedsReason={false}
                    onTeamTransfer={() => undefined}
                    onActionReasonChange={() => undefined}
                    onAssignToMe={() => undefined}
                    onReturnToQueue={() => undefined}
                    onStatusUpdate={() => undefined}
                    onRatingScoreChange={setRatingScore}
                    onRatingCommentChange={setRatingComment}
                    onRate={handleRate}
                  />
                </div>
              </details>
            )}
          </div>

          {showConversationPanel ? (
            <>
              <SupportConversation
                loading={detailQuery.isLoading}
                openingText={selectedCase.description}
                requesterName={selectedCase.requester.name}
                events={selectedCaseEvents}
                messages={selectedCaseMessages}
              />

              <form onSubmit={handleAddMessage} className="border-t border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-2">
                <label className="flex min-h-10 min-w-0 items-end gap-2 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-2.5 py-1.5 text-[12px] text-[var(--admin-text-secondary)] focus-within:border-[var(--admin-border-strong)]">
                  <textarea
                    aria-label="Adicionar mensagem ao atendimento"
                    placeholder="Responder ao atendimento..."
                    value={messageDraft}
                    onChange={(event) => setMessageDraft(event.currentTarget.value)}
                    rows={1}
                    className="max-h-24 min-h-8 min-w-0 flex-1 resize-none bg-transparent py-1 text-[12px] leading-5 text-[var(--admin-text-primary)] outline-none placeholder:text-[var(--admin-text-muted)]"
                  />
                  <button
                    type="submit"
                    aria-label="Enviar mensagem"
                    disabled={!messageDraft.trim() || messageMutation.isPending}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-panel-active)] text-[var(--admin-text-primary)] disabled:opacity-50"
                  >
                    <Send size={13} />
                  </button>
                </label>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="truncate text-[10.5px] text-[var(--admin-text-muted)]">
                    Nao envie CPF, laudos ou documentos por mensagem.
                  </p>
                  {messageMutation.isError ? (
                    <p className="shrink-0 text-[10.5px] text-[#ef4444]">{messageMutation.error.message}</p>
                  ) : null}
                </div>
              </form>
            </>
          ) : null}
        </div>

        {showDesktopManagementPanel ? (
          <aside className="admin-scrollbar hidden min-h-0 min-w-0 overflow-x-hidden overflow-y-auto bg-[var(--admin-surface-1)] p-2.5 lg:block">
            <SupportCaseDetails
              supportCase={selectedCase}
              fieldValues={selectedCaseFieldValues}
              isSupportUser={isSupportUser}
              teams={teams}
              actionReason={actionReason}
              ratingScore={ratingScore}
              ratingComment={ratingComment}
              updatePending={updateMutation.isPending}
              updateError={updateMutation.isError ? updateMutation.error.message : null}
              ratingPending={ratingMutation.isPending}
              sensitiveActionNeedsReason={sensitiveActionNeedsReason}
              onTeamTransfer={handleTeamTransfer}
              onActionReasonChange={setActionReason}
              onAssignToMe={handleAssignToMe}
              onReturnToQueue={handleReturnToQueue}
              onStatusUpdate={handleStatusUpdate}
              onRatingScoreChange={setRatingScore}
              onRatingCommentChange={setRatingComment}
              onRate={handleRate}
            />
          </aside>
        ) : null}

        {showMobileManagementPanel ? (
          <div className="admin-scrollbar min-h-0 flex-1 overflow-y-auto p-2 lg:hidden">
            <SupportCaseDetails
              supportCase={selectedCase}
              fieldValues={selectedCaseFieldValues}
              isSupportUser={isSupportUser}
              teams={teams}
              actionReason={actionReason}
              ratingScore={ratingScore}
              ratingComment={ratingComment}
              updatePending={updateMutation.isPending}
              updateError={updateMutation.isError ? updateMutation.error.message : null}
              ratingPending={ratingMutation.isPending}
              sensitiveActionNeedsReason={sensitiveActionNeedsReason}
              onTeamTransfer={handleTeamTransfer}
              onActionReasonChange={setActionReason}
              onAssignToMe={handleAssignToMe}
              onReturnToQueue={handleReturnToQueue}
              onStatusUpdate={handleStatusUpdate}
              onRatingScoreChange={setRatingScore}
              onRatingCommentChange={setRatingComment}
              onRate={handleRate}
            />
          </div>
        ) : null}
      </div>
    </SectionCard>
  ) : null;

  return (
    <main className="grid w-full gap-2">
      <section className="rounded-[6px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-2.5 text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)] backdrop-blur-[2px]">
        <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          {viewMode === 'list' ? (
            <div className="grid min-w-0 gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(220px,280px)] lg:items-center">
              <div className={filterGridClass}>
                {listToolbarFilters.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    aria-pressed={isSupportUser ? 'active' in filter && filter.active : activeFilter === filter.id}
                    onClick={() =>
                      isSupportUser
                        ? setOperatorQueueFilter(filter.id as SupportOperatorQueueView)
                        : setActiveFilter(filter.id as SupportCaseFilter)
                    }
                    className={cn(
                      filterButtonBaseClass,
                      (isSupportUser
                        ? 'active' in filter && filter.active
                        : activeFilter === filter.id)
                        ? filterButtonActiveClass
                        : filterButtonIdleClass,
                    )}
                  >
                    <span className="truncate">{filter.label}</span>
                    <span className="text-current/70">{filter.value}</span>
                  </button>
                ))}
              </div>
              <label className={searchFieldClass}>
                <Search size={14} className="shrink-0 text-[var(--admin-text-muted)]" />
                <input
                  type="search"
                  aria-label="Buscar atendimentos"
                  placeholder={isSupportUser ? 'Buscar por funcionario, codigo ou titulo' : 'Buscar atendimentos'}
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.currentTarget.value)}
                  className="min-w-0 flex-1 bg-transparent text-[12px] text-[var(--admin-text-primary)] outline-none placeholder:text-[var(--admin-text-muted)]"
                />
              </label>
            </div>
          ) : (
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => updateSupportRoute({ mode: 'list' })}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2.5 text-[10.5px] font-semibold text-[var(--admin-text-secondary)] transition hover:bg-[var(--admin-panel-active)] hover:text-[var(--admin-text-primary)]"
              >
                <ArrowLeft size={14} />
                Lista
              </button>
              <span className="truncate text-[12px] font-semibold text-[var(--admin-text-primary)]">
                {viewMode === 'new'
                  ? 'Novo atendimento'
                  : selectedCase?.code ?? (isSupportUser ? queueViewLabel(operatorQueueView) : 'Atendimento')}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => updateSupportRoute({ mode: 'new' })}
            className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-[4px] border border-[var(--admin-border-strong)] bg-[var(--admin-panel-active)] px-3 text-[10.5px] font-semibold text-[var(--admin-text-primary)] transition hover:bg-[var(--admin-surface-2)] sm:w-auto"
          >
            <Plus size={14} />
            Novo
          </button>
        </div>
      </section>

      {viewMode === 'new' ? (
        <SectionCard className="rounded-[6px] border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-3 text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)] backdrop-blur-[2px]">
          <form onSubmit={handleCreate} className="grid gap-2">
            <div className="flex items-center gap-2 text-[12.5px] font-semibold">
              <span className="flex h-7 w-7 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)]">
                <MessageSquarePlus size={15} />
              </span>
              Novo atendimento
            </div>

            <label className="grid gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-text-muted)]">Setor</span>
              <select
                value={departmentId}
                onChange={(event) => {
                  setDepartmentId(event.currentTarget.value);
                  setTopicId('');
                  resetDynamicForm();
                }}
                disabled={departments.length === 0}
                className="h-9 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2 text-[12px] font-semibold text-[var(--admin-text-primary)] outline-none"
              >
                {departments.length === 0 ? (
                  <option value="">Nenhum setor ativo</option>
                ) : null}
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>{department.name}</option>
                ))}
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-text-muted)]">Assunto</span>
              <select
                value={topicId}
                onChange={(event) => {
                  const nextTopicId = event.currentTarget.value;
                  const nextTopic = availableTopics.find((topic) => topic.id === nextTopicId);
                  setTopicId(nextTopicId);
                  setPriority(nextTopic?.defaultPriority ?? 'NORMAL');
                  resetDynamicForm();
                }}
                className="h-9 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2 text-[12px] font-semibold text-[var(--admin-text-primary)] outline-none"
              >
                {availableTopics.length === 0 ? (
                  <option value="">Geral do setor</option>
                ) : null}
                {availableTopics.map((topic) => (
                  <option key={topic.id} value={topic.id}>{topic.name}</option>
                ))}
              </select>
            </label>

            {catalogQuery.isError ? (
              <p className="rounded-[4px] border border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.10)] px-2 py-1.5 text-[11px] text-[rgba(255,210,210,0.95)]">
                {catalogQuery.error.message}
              </p>
            ) : null}
            {!catalogQuery.isLoading && departments.length === 0 ? (
              <p className="rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2 py-1.5 text-[11px] text-[var(--admin-text-secondary)]">
                Nenhum setor ativo foi encontrado para abertura de atendimento.
              </p>
            ) : null}

            <label className="grid gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-text-muted)]">Detalhe</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.currentTarget.value)}
                placeholder="Descreva em poucas linhas o que precisa resolver."
                rows={4}
                className="resize-none rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2 py-2 text-[12px] leading-5 text-[var(--admin-text-primary)] outline-none placeholder:text-[var(--admin-text-muted)]"
              />
              <span className="text-[10.5px] leading-4 text-[var(--admin-text-muted)]">
                Evite incluir CPF, dados medicos ou documentos aqui. Anexos e dados sensiveis terao fluxo proprio.
              </span>
            </label>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2 py-1.5">
              <p className="truncate text-[10.5px] text-[var(--admin-text-muted)]">
                A sugestao usa regras locais e precisa da sua confirmacao.
              </p>
              <button
                type="button"
                disabled={triageMutation.isPending || description.trim().length < 3}
                onClick={() => triageMutation.mutate(description)}
                className="h-7 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-2 text-[10.5px] font-semibold text-[var(--admin-text-primary)] disabled:opacity-50"
              >
                {triageMutation.isPending ? 'Sugerindo...' : 'Sugerir'}
              </button>
            </div>
            {triageMutation.data?.suggestion === null ? (
              <p className="text-[10.5px] text-[var(--admin-text-muted)]">
                Nao encontrei uma sugestao segura. Selecione setor e assunto manualmente.
              </p>
            ) : null}

            {activeForm ? (
              <div className="grid gap-2 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-2">
                <div>
                  <p className="text-[11.5px] font-semibold">{activeForm.title}</p>
                  {activeForm.description ? (
                    <p className="mt-0.5 text-[10.5px] leading-4 text-[var(--admin-text-muted)]">
                      {activeForm.description}
                    </p>
                  ) : null}
                </div>
                <DynamicSupportForm
                  form={activeForm}
                  values={formValues}
                  errors={formErrors}
                  onChange={(fieldCode, value) => {
                    setFormValues((currentValues) => ({
                      ...currentValues,
                      [fieldCode]: value,
                    }));
                    setFormErrors((currentErrors) => {
                      if (!currentErrors[fieldCode]) {
                        return currentErrors;
                      }

                      const { [fieldCode]: _removed, ...nextErrors } = currentErrors;
                      return nextErrors;
                    });
                  }}
                />
              </div>
            ) : null}

            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <select
                value={priority}
                onChange={(event) => setPriority(event.currentTarget.value as SupportCasePriority)}
                aria-label="Prioridade"
                className="h-9 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2 text-[12px] font-semibold text-[var(--admin-text-primary)] outline-none"
              >
                <option value="NORMAL">Normal</option>
                <option value="HIGH">Alta</option>
                <option value="URGENT">Urgente</option>
                <option value="LOW">Baixa</option>
              </select>
              <button
                type="submit"
                disabled={createMutation.isPending || !selectedDepartment}
                className="h-9 rounded-[4px] border border-[var(--admin-border-strong)] bg-[var(--admin-panel-active)] px-3 text-[11px] font-semibold text-[var(--admin-text-primary)] transition hover:bg-[var(--admin-surface-2)] disabled:opacity-50"
              >
                {createMutation.isPending ? 'Abrindo...' : 'Abrir'}
              </button>
            </div>
            {createMutation.isError ? (
              <p className="text-[11px] text-[#ef4444]">{createMutation.error.message}</p>
            ) : null}
          </form>
        </SectionCard>
      ) : null}

      {showDesktopSupportWorkspace ? (
        <div className="hidden min-h-0 gap-2 lg:grid lg:grid-cols-[220px_minmax(320px,360px)_minmax(0,1fr)]">
          {operatorQueuesCard}
          {casesListCard}
          {selectedCaseDetailCard}
        </div>
      ) : null}

      {!showDesktopSupportWorkspace && viewMode === 'list' ? (
        isSupportUser ? (
          <div className="grid min-h-0 gap-2 lg:grid-cols-[220px_minmax(0,1fr)]">
            {operatorQueuesCard}
            {casesListCard}
          </div>
        ) : (
          casesListCard
        )
      ) : null}

      {!showDesktopSupportWorkspace && viewMode === 'detail' && selectedCase ? selectedCaseDetailCard : null}
    </main>
  );
}

function SupportCaseDetails({
  supportCase,
  fieldValues,
  isSupportUser,
  teams,
  actionReason,
  ratingScore,
  ratingComment,
  updatePending,
  updateError,
  ratingPending,
  sensitiveActionNeedsReason,
  onTeamTransfer,
  onActionReasonChange,
  onAssignToMe,
  onReturnToQueue,
  onStatusUpdate,
  onRatingScoreChange,
  onRatingCommentChange,
  onRate,
}: {
  supportCase: SupportCaseListItem;
  fieldValues: SupportCaseDetail['fieldValues'];
  isSupportUser: boolean;
  teams: SupportTeam[];
  actionReason: string;
  ratingScore: number;
  ratingComment: string;
  updatePending: boolean;
  updateError: string | null;
  ratingPending: boolean;
  sensitiveActionNeedsReason: boolean;
  onTeamTransfer: (teamCode: string) => void;
  onActionReasonChange: (value: string) => void;
  onAssignToMe: () => void;
  onReturnToQueue: () => void;
  onStatusUpdate: (status: SupportCaseStatus) => void;
  onRatingScoreChange: (score: number) => void;
  onRatingCommentChange: (value: string) => void;
  onRate: (supportCase: SupportCaseListItem) => void;
}) {
  const canRate = supportCase.status === 'RESOLVED' || supportCase.status === 'CLOSED';

  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-1">
        <DetailTile label="Solicitante" value={supportCase.requester.name} />
        <DetailTile label="Setor" value={supportCase.department?.name ?? 'Nao classificado'} />
        <DetailTile label="Assunto" value={supportCase.topic?.name ?? 'Geral'} />
        <DetailTile label="Atendente" value={supportCase.assignedUser?.name ?? 'Fila da equipe'} />
      </div>

      {fieldValues.length > 0 ? (
        <div className="grid gap-1.5 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-text-muted)]">Campos</p>
          {fieldValues.map((fieldValue) => (
            <div key={fieldValue.id} className="grid gap-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-text-muted)]">
                {fieldValue.label}
              </p>
              <p className="truncate text-[12px] text-[var(--admin-text-primary)]">
                {fieldValue.sensitive ? 'Informacao sensivel protegida' : String(fieldValue.value ?? '')}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {isSupportUser ? (
        <div className="grid gap-2 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-text-muted)]">Acoes</p>
          <select
            value={supportCase.teamCode ?? ''}
            onChange={(event) => onTeamTransfer(event.currentTarget.value)}
            aria-label="Transferir equipe"
            disabled={updatePending || sensitiveActionNeedsReason}
            className="h-8 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-2 text-[11px] font-semibold text-[var(--admin-text-primary)] outline-none disabled:opacity-50"
          >
            {teams.map((team) => (
              <option key={team.id} value={team.code}>{team.name}</option>
            ))}
          </select>
          <textarea
            value={actionReason}
            onChange={(event) => onActionReasonChange(event.currentTarget.value)}
            aria-label="Motivo da acao"
            placeholder="Motivo para transferir, resolver ou fechar"
            rows={2}
            className="resize-none rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-2 py-1.5 text-[11px] leading-4 text-[var(--admin-text-primary)] outline-none placeholder:text-[var(--admin-text-muted)]"
          />
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-2">
            <CompactAction label="Assumir" onClick={onAssignToMe} disabled={updatePending} />
            <CompactAction
              label="Devolver"
              onClick={onReturnToQueue}
              disabled={updatePending || !supportCase.assignedUser || sensitiveActionNeedsReason}
            />
            <CompactAction
              label="Em atendimento"
              onClick={() => onStatusUpdate('OPEN')}
              disabled={updatePending || supportCase.status === 'OPEN'}
            />
            <CompactAction
              label="Aguardar"
              onClick={() => onStatusUpdate('WAITING_REQUESTER')}
              disabled={updatePending || supportCase.status === 'WAITING_REQUESTER'}
            />
            <CompactAction
              label="Resolver"
              onClick={() => onStatusUpdate('RESOLVED')}
              disabled={updatePending || supportCase.status === 'RESOLVED' || sensitiveActionNeedsReason}
            />
            <CompactAction
              label="Fechar"
              onClick={() => onStatusUpdate('CLOSED')}
              disabled={updatePending || supportCase.status === 'CLOSED' || sensitiveActionNeedsReason}
            />
          </div>
          {updateError ? <p className="text-[11px] text-[#ef4444]">{updateError}</p> : null}
        </div>
      ) : null}

      <div className="rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-2">
        {supportCase.rating ? (
          <div>
            <div className="flex items-center gap-1 text-[12px] font-semibold">
              <Star size={14} className="text-[#facc15]" />
              Avaliado com {supportCase.rating.score}/5
            </div>
            <p className="mt-1 text-[11.5px] leading-5 text-[var(--admin-text-secondary)]">
              {supportCase.rating.comment ?? 'Sem comentario.'}
            </p>
          </div>
        ) : canRate ? (
          <div className="grid gap-2">
            <div className="flex items-center gap-1.5 text-[12px] font-semibold">
              <CheckCircle2 size={14} />
              Avaliar atendimento
            </div>
            <select
              value={ratingScore}
              onChange={(event) => onRatingScoreChange(Number(event.currentTarget.value))}
              aria-label="Nota do atendimento"
              className="h-8 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-2 text-[12px] text-[var(--admin-text-primary)] outline-none"
            >
              {[5, 4, 3, 2, 1].map((score) => (
                <option key={score} value={score}>{score}/5</option>
              ))}
            </select>
            <input
              value={ratingComment}
              onChange={(event) => onRatingCommentChange(event.currentTarget.value)}
              placeholder="Comentario opcional, sem dados sensiveis"
              className="h-8 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-2 text-[12px] text-[var(--admin-text-primary)] outline-none placeholder:text-[var(--admin-text-muted)]"
            />
            <button
              type="button"
              disabled={ratingPending}
              onClick={() => onRate(supportCase)}
              className="h-8 rounded-[4px] border border-[var(--admin-border-strong)] bg-[var(--admin-panel-active)] px-3 text-[11px] font-semibold text-[var(--admin-text-primary)] disabled:opacity-50"
            >
              {ratingPending ? 'Salvando...' : 'Enviar avaliacao'}
            </button>
          </div>
        ) : (
          <p className="text-[12px] leading-5 text-[var(--admin-text-secondary)]">
            A avaliacao fica disponivel quando o atendimento for resolvido.
          </p>
        )}
      </div>
    </div>
  );
}

function SupportConversation({
  openingText,
  requesterName,
  events,
  messages,
  loading,
}: {
  openingText: string | null;
  requesterName: string;
  events: Array<{
    id: string;
    type: string;
    fromValue: string | null;
    toValue: string | null;
    author: {
      id: string;
      name: string;
      email: string;
    } | null;
    createdAt: string;
  }>;
  messages: Array<{
    id: string;
    body: string;
    senderName: string;
    mine: boolean;
    createdAt: string;
  }>;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="admin-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div className="rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2.5 py-2 text-[12px] text-[var(--admin-text-secondary)]">
          Carregando conversa...
        </div>
      </div>
    );
  }

  const normalizedOpeningText = openingText?.trim() ?? '';
  const openingAlreadyInMessages = messages.some(
    (message) => message.mine && message.body.trim() === normalizedOpeningText,
  );
  const conversationItems = [
    normalizedOpeningText && !openingAlreadyInMessages
      ? {
          id: 'opening-message',
          date: messages[0]?.createdAt ?? events[0]?.createdAt ?? new Date().toISOString(),
          title: requesterName,
          detail: normalizedOpeningText,
          type: 'message' as const,
          mine: true,
        }
      : null,
    ...events.map((event) => ({
      id: event.id,
      date: event.createdAt,
      title: eventTypeLabel(event.type),
      detail: [
        event.author?.name ?? 'Sistema',
        event.toValue ? eventValueLabel(event.type, event.toValue) : null,
      ]
        .filter(Boolean)
        .join(' • '),
      type: 'event' as const,
      mine: false,
    })),
    ...messages.map((message) => ({
      id: message.id,
      date: message.createdAt,
      title: message.senderName,
      detail: message.body,
      type: 'message' as const,
      mine: message.mine,
    })),
  ]
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime());

  if (conversationItems.length === 0) {
    return (
      <div className="admin-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div className="rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2.5 py-2 text-[12px] text-[var(--admin-text-secondary)]">
          A conversa do atendimento aparece aqui.
        </div>
      </div>
    );
  }

  return (
    <div className="admin-scrollbar min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgba(255,255,255,0.025),transparent_18%,transparent_82%,rgba(0,0,0,0.12))] px-3 py-3">
      <div className="grid gap-2">
        {conversationItems.map((item) => (
          item.type === 'event' ? (
            <div key={`${item.type}-${item.id}`} className="mx-auto max-w-[86%] rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2 py-1 text-center">
              <p className="text-[10.5px] font-semibold text-[var(--admin-text-secondary)]">{item.title}</p>
              <p className="mt-0.5 text-[10px] text-[var(--admin-text-muted)]">
                {formatDate(item.date)}
                {item.detail ? ` - ${item.detail}` : ''}
              </p>
            </div>
          ) : (
            <div
              key={`${item.type}-${item.id}`}
              className={cn('flex', item.mine ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[88%] rounded-[6px] border px-2.5 py-2 shadow-[var(--admin-shadow)] sm:max-w-[74%]',
                  item.mine
                    ? 'border-[var(--admin-border-strong)] bg-[var(--admin-panel-active)]'
                    : 'border-[var(--admin-border)] bg-[var(--admin-surface-2)]',
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-[10.5px] font-semibold text-[var(--admin-text-secondary)]">
                    {item.mine ? 'Voce' : item.title}
                  </p>
                  <p className="shrink-0 text-[9.5px] text-[var(--admin-text-muted)]">{formatDate(item.date)}</p>
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-[12px] leading-5 text-[var(--admin-text-primary)]">
                  {item.detail}
                </p>
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}

function DynamicSupportForm({
  form,
  values,
  errors,
  onChange,
}: {
  form: { fields: SupportTopicField[] };
  values: DynamicFormValues;
  errors: DynamicFormErrors;
  onChange: (fieldCode: string, value: DynamicFormValue) => void;
}) {
  return (
    <div className="grid gap-2">
      {form.fields.map((field) => (
        <DynamicSupportField
          key={field.id}
          field={field}
          value={values[field.code]}
          values={values}
          error={errors[field.code]}
          onChange={(value) => onChange(field.code, value)}
        />
      ))}
    </div>
  );
}

function DynamicSupportField({
  field,
  value,
  values,
  error,
  onChange,
}: {
  field: SupportTopicField;
  value: DynamicFormValue | undefined;
  values: DynamicFormValues;
  error?: string;
  onChange: (value: DynamicFormValue) => void;
}) {
  if (!isDynamicFieldVisible(field, values)) {
    return null;
  }

  const required = isDynamicFieldRequired(field, values);

  return (
    <label className="grid gap-1">
      <span className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-text-muted)]">
        <span className="truncate">{field.label}</span>
        {required ? <span className="text-current/70">obrigatorio</span> : null}
      </span>
      <DynamicSupportFieldControl field={field} value={value} onChange={onChange} />
      {error ? (
        <span className="text-[10.5px] leading-4 text-[#ef4444]">
          {error}
        </span>
      ) : null}
      {field.helpText || field.sensitive ? (
        <span className="text-[10.5px] leading-4 text-[var(--admin-text-muted)]">
          {field.sensitive ? 'Informacao tratada como sensivel. ' : ''}
          {field.helpText ?? ''}
        </span>
      ) : null}
    </label>
  );
}

function DynamicSupportFieldControl({
  field,
  value,
  onChange,
}: {
  field: SupportTopicField;
  value: DynamicFormValue | undefined;
  onChange: (value: DynamicFormValue) => void;
}) {
  if (field.type === 'TEXTAREA') {
    return (
      <textarea
        value={String(value ?? '')}
        onChange={(event) => onChange(event.currentTarget.value)}
        rows={3}
        className="resize-none rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-2 py-1.5 text-[12px] leading-5 text-[var(--admin-text-primary)] outline-none placeholder:text-[var(--admin-text-muted)]"
      />
    );
  }

  if (field.type === 'SELECT') {
    return (
      <DynamicSupportSelectInput
        value={String(value ?? '')}
        options={fieldOptions(field.options)}
        optionSourceKey={field.optionSourceKey ?? undefined}
        onChange={onChange}
      />
    );
  }

  if (field.type === 'BOOLEAN') {
    return (
      <span className="flex min-h-8 items-center gap-2 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-2 text-[12px] text-[var(--admin-text-primary)]">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.currentTarget.checked)}
        />
        Confirmar
      </span>
    );
  }

  if (field.type === 'FILE') {
    return (
      <div className="rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-2 py-1.5 text-[11px] text-[var(--admin-text-muted)]">
        Anexos privados entram na proxima fase.
      </div>
    );
  }

  return (
    <input
      type={field.type === 'DATE' ? 'date' : field.type === 'NUMBER' ? 'number' : 'text'}
      value={String(value ?? '')}
      onChange={(event) => onChange(event.currentTarget.value)}
      className={dynamicFormInputClass}
    />
  );
}

function DynamicSupportSelectInput({
  value,
  options,
  optionSourceKey,
  onChange,
}: {
  value: string;
  options: string[];
  optionSourceKey?: string;
  onChange: (value: string) => void;
}) {
  const remoteOptionsQuery = useQuery({
    queryKey: ['forms', 'option-source', optionSourceKey],
    queryFn: () => queryOptionSource(optionSourceKey!, { limit: 100 }),
    enabled: Boolean(optionSourceKey),
    staleTime: 60_000,
  });
  const availableOptions = optionSourceKey
    ? remoteOptionsQuery.data?.items ?? []
    : options.map((option) => ({ value: option, label: option }));

  return (
    <select
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
      className={dynamicFormInputClass}
    >
      <option value="">Selecione</option>
      {availableOptions.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  );
}

function formValuesPayload(
  fields: SupportTopicField[],
  values: DynamicFormValues,
) {
  return fields
    .filter((field) => isDynamicFieldVisible(field, values))
    .map((field) => ({
      fieldId: field.id,
      value: normalizeDynamicFieldValue(values[field.code]),
    }))
    .filter((fieldValue) => fieldValue.value);
}

function validateDynamicSupportForm(fields: SupportTopicField[], values: DynamicFormValues) {
  return fields.reduce<DynamicFormErrors>((errors, field) => {
    if (!isDynamicFieldVisible(field, values) || !isDynamicFieldRequired(field, values)) {
      return errors;
    }

    if (!normalizeDynamicFieldValue(values[field.code])) {
      return {
        ...errors,
        [field.code]: 'Campo obrigatorio.',
      };
    }

    return errors;
  }, {});
}

function isDynamicFieldVisible(field: SupportTopicField, values: DynamicFormValues) {
  return field.visibleWhen ? dynamicConditionsMatch(field.visibleWhen, values) : true;
}

function isDynamicFieldRequired(field: SupportTopicField, values: DynamicFormValues) {
  return field.required || Boolean(field.requiredWhen && dynamicConditionsMatch(field.requiredWhen, values));
}

function queueViewLabel(queueView: SupportOperatorQueueView) {
  const labels: Record<SupportOperatorQueueView, string> = {
    'novos-e-meus': 'Visao ampla',
    'nao-atribuidos': 'Backlog da equipe',
    'meus-atendimentos': 'Comigo',
    aguardando: 'Aguardando',
    'alta-prioridade': 'Alta prioridade',
    resolvidos: 'Resolvidos',
  };

  return labels[queueView];
}

function filterCasesForOperatorQueue(
  cases: SupportCaseListItem[],
  isSupportUser: boolean,
  queueView: SupportOperatorQueueView,
  currentUserId: string,
) {
  if (!isSupportUser) {
    return cases;
  }

  return cases.filter((supportCase) => {
    const mine = supportCase.assignedUser?.id === currentUserId;
    const unassigned = !supportCase.assignedUser;
    const resolved = supportCase.status === 'RESOLVED' || supportCase.status === 'CLOSED';
    const waiting =
      supportCase.status === 'WAITING_REQUESTER' || supportCase.status === 'WAITING_INTERNAL';
    const urgent = supportCase.priority === 'HIGH' || supportCase.priority === 'URGENT';

    if (queueView === 'novos-e-meus') {
      return !resolved && (mine || unassigned);
    }

    if (queueView === 'nao-atribuidos') {
      return !resolved && unassigned;
    }

    if (queueView === 'meus-atendimentos') {
      return !resolved && mine;
    }

    if (queueView === 'aguardando') {
      return !resolved && waiting;
    }

    if (queueView === 'alta-prioridade') {
      return !resolved && urgent;
    }

    return resolved;
  });
}

function supportOperatorQueueDefinitions(
  cases: SupportCaseListItem[],
  currentUserId: string,
) {
  const definitions: Array<{
    id: SupportOperatorQueueView;
    label: string;
    description: string;
  }> = [
    {
      id: 'nao-atribuidos',
      label: 'Backlog da equipe',
      description: 'Sem responsavel para assumir',
    },
    {
      id: 'novos-e-meus',
      label: 'Visao ampla',
      description: 'Backlog e atendimentos em andamento',
    },
    {
      id: 'meus-atendimentos',
      label: 'Comigo',
      description: 'Responsabilidade atual',
    },
    {
      id: 'aguardando',
      label: 'Aguardando',
      description: 'Esperando retorno ou tratativa',
    },
    {
      id: 'alta-prioridade',
      label: 'Alta prioridade',
      description: 'Casos criticos e urgentes',
    },
    {
      id: 'resolvidos',
      label: 'Resolvidos',
      description: 'Historico recente',
    },
  ];

  return definitions.map((definition) => ({
    ...definition,
    count: filterCasesForOperatorQueue(cases, true, definition.id, currentUserId).length,
    value: filterCasesForOperatorQueue(cases, true, definition.id, currentUserId).length,
  }));
}

function dynamicConditionsMatch(conditions: unknown, values: DynamicFormValues) {
  const parsed = objectConditionsOrNull(conditions);

  if (!parsed) {
    return false;
  }

  const mode = Array.isArray(parsed.any) ? 'any' : 'all';
  const source = Array.isArray(parsed[mode]) ? parsed[mode] : [];

  if (source.length === 0) {
    return false;
  }

  return mode === 'any'
    ? source.some((condition) => dynamicConditionClauseMatches(condition, values))
    : source.every((condition) => dynamicConditionClauseMatches(condition, values));
}

function dynamicConditionClauseMatches(condition: unknown, values: DynamicFormValues) {
  const parsed = objectConditionsOrNull(condition);

  if (!parsed || typeof parsed.fieldCode !== 'string') {
    return false;
  }

  const actual = normalizeComparableConditionValue(values[parsed.fieldCode]);
  const operator = parsed.operator ?? 'equals';

  if (operator === 'exists') {
    return actual.length > 0;
  }

  if (operator === 'notEquals') {
    return actual !== normalizeComparableConditionValue(parsed.value);
  }

  if (operator === 'contains') {
    return actual.includes(normalizeComparableConditionValue(parsed.value));
  }

  if (operator === 'in' && Array.isArray(parsed.values)) {
    return parsed.values.map(normalizeComparableConditionValue).includes(actual);
  }

  return actual === normalizeComparableConditionValue(parsed.value);
}

function objectConditionsOrNull(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function normalizeComparableConditionValue(value: unknown) {
  return String(value ?? '').trim().toLocaleLowerCase('pt-BR');
}

function normalizeDynamicFieldValue(value: unknown) {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  return String(value ?? '').trim();
}

function fieldOptions(options: unknown) {
  if (!Array.isArray(options)) {
    return [];
  }

  return options.filter((option): option is string => typeof option === 'string');
}

function CompactAction({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-8 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-2 text-[10.5px] font-semibold text-[var(--admin-text-primary)] transition hover:bg-[var(--admin-panel-active)] disabled:opacity-50"
    >
      {label}
    </button>
  );
}

function QueueStatChip({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-2 py-1.5">
      <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-[12px] font-semibold text-[var(--admin-text-primary)]">
        {value}
      </p>
    </div>
  );
}

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-text-muted)]">{label}</p>
      <p className="mt-0.5 truncate text-[12px] font-semibold">{value}</p>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function eventTypeLabel(type: string) {
  const labels: Record<string, string> = {
    CREATED: 'Atendimento criado',
    STATUS_CHANGED: 'Status atualizado',
    ASSIGNED: 'Responsavel alterado',
    TRANSFERRED: 'Equipe alterada',
    COMMENTED: 'Mensagem registrada',
    LINKED_MESSAGE: 'Mensagem vinculada',
  };

  return labels[type] ?? type;
}

function eventValueLabel(type: string, value: string) {
  if (type === 'COMMENTED' || type === 'LINKED_MESSAGE') {
    return 'conteudo registrado';
  }

  return value;
}
