import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  CheckCheck,
  CheckCircle2,
  Link,
  MessageSquarePlus,
  MoreHorizontal,
  Paperclip,
  Plus,
  RefreshCcw,
  Search,
  Send,
  Smile,
  Star,
  TicketCheck,
  Type,
} from 'lucide-react';
import { SectionCard } from '../../components/ui/section-card';
import { StatusPill } from '../../components/ui/status-pill';
import { useAuthSession } from '../../features/auth/use-auth-session';
import { cn } from '../../lib/cn';
import { queryOptionSource } from '../quick-forms/forms-api';
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
  type SupportResolutionReason,
  type SupportTeam,
  type SupportTopicField,
  type SupportTransferReason,
} from './support-api';

const filterGridClass = 'grid min-w-0 grid-cols-2 gap-1.5 sm:flex sm:flex-wrap';
const filterButtonBaseClass =
  'inline-flex h-8 min-w-0 items-center justify-center gap-1 rounded-[4px] border px-2 text-[9.5px] font-semibold leading-none transition sm:min-w-[128px] sm:flex-none';
const filterButtonActiveClass =
  'border-[var(--admin-border-strong)] bg-[var(--admin-panel-active)] text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)]';
const filterButtonIdleClass =
  'border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-panel-active)] hover:text-[var(--admin-text-primary)]';
const searchFieldClass =
  'flex h-8 min-w-0 items-center gap-2 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2.5 text-[12px] text-[var(--admin-text-secondary)] transition focus-within:border-[var(--admin-border-strong)] focus-within:bg-[var(--admin-panel-active)]';
const dynamicFormInputClass =
  'h-8 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-2 text-[12px] text-[var(--admin-text-primary)] outline-none placeholder:text-[var(--admin-text-muted)]';
const supportIconButtonClass =
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] text-[var(--admin-text-secondary)] transition hover:border-[var(--admin-border-strong)] hover:bg-[var(--admin-panel-active)] hover:text-[var(--admin-text-primary)] disabled:opacity-45';

const statusLabels: Record<SupportCaseStatus, string> = {
  NEW: 'novo',
  OPEN: 'em atendimento',
  WAITING_REQUESTER: 'aguardando',
  WAITING_INTERNAL: 'interno',
  WAITING_APPROVAL: 'aprovação',
  RESOLVED: 'resolvido',
  CLOSED: 'fechado',
};

const priorityLabels: Record<SupportCasePriority, string> = {
  LOW: 'baixa',
  NORMAL: 'normal',
  HIGH: 'alta',
  URGENT: 'urgente',
};

const actionReasonOptions: Array<{ value: SupportTransferReason | SupportResolutionReason; label: string }> = [
  { value: 'OTHER', label: 'Outro motivo' },
  { value: 'WRONG_TEAM', label: 'Equipe incorreta' },
  { value: 'NEEDS_SPECIALIST', label: 'Precisa especialista' },
  { value: 'NEEDS_APPROVAL', label: 'Precisa aprovacao' },
  { value: 'INSUFFICIENT_INFORMATION', label: 'Faltam informacoes' },
  { value: 'RESOLVED', label: 'Resolvido' },
  { value: 'DUPLICATE', label: 'Duplicado' },
  { value: 'REQUESTER_CANCELLED', label: 'Cancelado pelo solicitante' },
  { value: 'OUT_OF_SCOPE', label: 'Fora de escopo' },
  { value: 'NO_REQUESTER_RETURN', label: 'Sem retorno do solicitante' },
];

const transferReasons = new Set<string>([
  'WRONG_TEAM',
  'NEEDS_SPECIALIST',
  'NEEDS_APPROVAL',
  'INSUFFICIENT_INFORMATION',
  'OTHER',
]);
const resolutionReasons = new Set<string>([
  'RESOLVED',
  'DUPLICATE',
  'REQUESTER_CANCELLED',
  'OUT_OF_SCOPE',
  'NO_REQUESTER_RETURN',
  'OTHER',
]);

type SupportViewMode = 'list' | 'new' | 'detail';
type SupportMobilePanel = 'conversation' | 'manage';
type DynamicFormValue = string | boolean;
type DynamicFormValues = Record<string, DynamicFormValue>;
type DynamicFormErrors = Record<string, string>;

function statusTone(status: SupportCaseStatus) {
  if (status === 'RESOLVED' || status === 'CLOSED') {
    return 'neutral' as const;
  }

  if (status === 'WAITING_REQUESTER' || status === 'WAITING_INTERNAL' || status === 'WAITING_APPROVAL') {
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
    queueView === 'para-assumir' ||
    queueView === 'meus-atendimentos' ||
    queueView === 'da-equipe' ||
    queueView === 'sla-critico' ||
    queueView === 'todos'
  ) {
    return queueView;
  }

  if (queueView === 'nao-atribuidos') {
    return 'para-assumir';
  }

  if (queueView === 'novos-e-meus') {
    return 'da-equipe';
  }

  if (queueView === 'alta-prioridade') {
    return 'sla-critico';
  }

  return 'para-assumir';
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
          openingPolicy: topic.openingPolicy,
          businessKeyFieldCode: topic.businessKeyFieldCode,
          form: topic.forms.find((form) => form.status !== 'INACTIVE') ?? null,
        })),
    }));
}

function normalizeCatalogCode(value: string | null) {
  return value?.trim().toUpperCase() ?? '';
}

function findDepartmentByCode(departments: SupportDepartment[], code: string) {
  const normalizedCode = normalizeCatalogCode(code);
  if (!normalizedCode) {
    return null;
  }

  return departments.find((department) => department.code.toUpperCase() === normalizedCode) ?? null;
}

function findTopicByCode(department: SupportDepartment | null, code: string) {
  const normalizedCode = normalizeCatalogCode(code);
  if (!department || !normalizedCode) {
    return null;
  }

  return department.topics.find((topic) => topic.code.toUpperCase() === normalizedCode) ?? null;
}

export function SupportPage() {
  const queryClient = useQueryClient();
  const session = useAuthSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const viewMode = parseSupportViewMode(searchParams);
  const [activeFilter, setActiveFilter] = useState<SupportCaseFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const selectedId = searchParams.get('caso');
  const routeDepartmentCode = normalizeCatalogCode(searchParams.get('setor'));
  const routeTopicCode = normalizeCatalogCode(searchParams.get('assunto'));
  const [optimisticSelectedCase, setOptimisticSelectedCase] =
    useState<SupportCaseDetail | null>(null);
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [priority, setPriority] = useState<SupportCasePriority>('NORMAL');
  const [formValues, setFormValues] = useState<DynamicFormValues>({});
  const [formErrors, setFormErrors] = useState<DynamicFormErrors>({});
  const [messageDraft, setMessageDraft] = useState('');
  const [actionReason, setActionReason] = useState<SupportTransferReason | SupportResolutionReason>('OTHER');
  const [actionComment, setActionComment] = useState('');
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
      { id: 'waiting' as const, label: 'Aguardando', value: cases.filter((item) => item.status === 'WAITING_REQUESTER' || item.status === 'WAITING_APPROVAL').length },
      { id: 'resolved' as const, label: 'Resolvidos', value: cases.filter((item) => item.status === 'RESOLVED').length },
    ],
    [cases],
  );

  useEffect(() => {
    if (departmentId || departments.length === 0) {
      return;
    }

    const routeDepartment = findDepartmentByCode(departments, routeDepartmentCode);
    setDepartmentId((routeDepartment ?? departments[0]).id);
  }, [departmentId, departments, routeDepartmentCode]);

  useEffect(() => {
    const routeDepartment = findDepartmentByCode(departments, routeDepartmentCode);
    if (!routeDepartment) {
      return;
    }

    if (departmentId !== routeDepartment.id) {
      setDepartmentId(routeDepartment.id);
    }

    const routeTopic = findTopicByCode(routeDepartment, routeTopicCode);
    if (routeTopic && topicId !== routeTopic.id) {
      setTopicId(routeTopic.id);
      setPriority(routeTopic.defaultPriority);
    }
  }, [departmentId, departments, routeDepartmentCode, routeTopicCode, topicId]);

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

    const nextTopic =
      findTopicByCode(selectedDepartment, routeTopicCode) ??
      selectedDepartment.topics[0] ??
      null;
    setTopicId(nextTopic?.id ?? '');
    setPriority(nextTopic?.defaultPriority ?? 'NORMAL');
  }, [routeTopicCode, selectedDepartment, topicId]);

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
      setActionReason('OTHER');
      setActionComment('');
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
      changeReason: resolutionReasonForStatus(status, actionReason),
      changeComment: actionComment.trim() || undefined,
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
      changeComment: actionComment.trim() || undefined,
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
      changeReason: transferReasonForAction(actionReason),
      changeComment: actionComment.trim() || undefined,
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
  const sensitiveActionNeedsReason = !actionReason;
  const isLargeViewport = useMediaQuery('(min-width: 1024px)');
  const showDesktopSupportWorkspace =
    isLargeViewport && isSupportUser && viewMode === 'detail' && Boolean(selectedCase);
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
        label: 'Meus atendimentos',
        value: allCases.filter(
          (supportCase) =>
            supportCase.assignedUser?.id === session?.user.id &&
            supportCase.status !== 'RESOLVED' &&
            supportCase.status !== 'CLOSED',
        ).length,
      },
      {
        label: 'Para assumir',
        value: allCases.filter(
          (supportCase) =>
            !supportCase.assignedUser &&
            supportCase.status !== 'RESOLVED' &&
            supportCase.status !== 'CLOSED',
        ).length,
      },
      {
        label: 'SLA critico',
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

  const operatorQueueTabs = isSupportUser ? (
    <WorkQueueTabs
      items={operatorQueueViews}
      onSelect={setOperatorQueueFilter}
    />
  ) : null;
  const primaryCaseAction = selectedCase && isSupportUser
    ? supportPrimaryCaseAction(selectedCase, session?.user.id ?? '')
    : null;
  const runPrimaryCaseAction = () => {
    if (!primaryCaseAction) {
      return;
    }

    if (primaryCaseAction.action === 'assign') {
      handleAssignToMe();
      return;
    }

    if (primaryCaseAction.action === 'open') {
      handleStatusUpdate('OPEN');
      return;
    }

    if (primaryCaseAction.action === 'resolve') {
      handleStatusUpdate('RESOLVED');
      return;
    }

    handleStatusUpdate('CLOSED');
  };

  const casesListCard = (
    <SectionCard
      className={cn(
        'flex min-h-[360px] min-w-0 flex-col overflow-hidden rounded-[6px] border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-0 text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)] backdrop-blur-[2px]',
        showDesktopSupportWorkspace
          ? 'lg:h-[calc(100vh-178px)] lg:min-h-0 lg:max-h-none'
          : 'max-h-[calc(100vh-178px)]',
      )}
    >
      {!showDesktopSupportWorkspace ? (
        <div className="hidden grid-cols-[34px_74px_minmax(170px,1.45fr)_minmax(96px,0.7fr)_minmax(96px,0.72fr)_94px] gap-2 border-b border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-text-muted)] xl:grid">
          <span />
          <span>#</span>
          <span>Titulo</span>
          <span>Solicitante</span>
          <span>Status</span>
          <span className="text-right">Atualizacao</span>
        </div>
      ) : null}
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
        {cases.length > 0 ? cases.map((supportCase) => {
          const slaSignal = supportCaseSlaSignal(supportCase);

          return (
            <button
              key={supportCase.id}
              type="button"
              onClick={() => openSupportCaseDetail(supportCase.id)}
              className={cn(
                'grid w-full grid-cols-[30px_minmax(0,1fr)_auto] gap-2 px-2.5 py-2.5 text-left transition hover:bg-[var(--admin-surface-2)] sm:px-3',
                !showDesktopSupportWorkspace && 'xl:grid-cols-[34px_74px_minmax(170px,1.45fr)_minmax(96px,0.7fr)_minmax(96px,0.72fr)_94px] xl:items-center xl:py-2',
                selectedCase?.id === supportCase.id
                  ? 'bg-[var(--admin-panel-active)] shadow-[inset_2px_0_0_var(--admin-border-strong)]'
                  : 'bg-transparent',
              )}
            >
              <span className="mt-0.5 flex h-7.5 w-7.5 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)] xl:mt-0">
                <TicketCheck size={14} />
              </span>
              <span className={cn('text-[11px] font-semibold text-[var(--admin-text-muted)]', showDesktopSupportWorkspace ? 'hidden' : 'hidden xl:block')}>
                {supportCase.code}
              </span>
              <span className="min-w-0">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-[12.5px] font-semibold">{supportCase.title}</span>
                  <span className={cn(!showDesktopSupportWorkspace && 'xl:hidden')}>
                    <StatusPill label={statusLabels[supportCase.status]} tone={statusTone(supportCase.status)} />
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-[12px] text-[var(--admin-text-secondary)]">
                  {supportCase.description ?? 'Sem detalhe informado'}
                </span>
                <span className={cn('mt-0.5 block text-[10.5px] text-[var(--admin-text-muted)]', !showDesktopSupportWorkspace && 'xl:hidden')}>
                  {supportCase.code} • {supportCase.teamName} • {priorityLabels[supportCase.priority]}
                </span>
                {isSupportUser ? (
                  <span className={cn('mt-1 flex flex-wrap gap-1', !showDesktopSupportWorkspace && 'xl:hidden')}>
                    <span className="inline-flex h-5 items-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-1.5 text-[9.5px] font-semibold text-[var(--admin-text-secondary)]">
                      {supportCase.assignedUser?.id === session?.user.id
                          ? 'Com voce'
                          : supportCase.assignedUser
                            ? supportCase.assignedUser.name
                          : 'Para assumir'}
                    </span>
                    <StatusPill label={slaSignal.label} tone={slaSignal.tone} />
                    {supportCase.priority === 'HIGH' || supportCase.priority === 'URGENT' ? (
                      <span className="inline-flex h-5 items-center rounded-[4px] border border-[rgba(239,68,68,0.35)] bg-[rgba(123,22,32,0.24)] px-1.5 text-[9.5px] font-semibold text-[var(--admin-text-primary)]">
                        Prioridade {priorityLabels[supportCase.priority]}
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </span>
              <span className={cn('min-w-0 text-[11px] text-[var(--admin-text-secondary)]', showDesktopSupportWorkspace ? 'hidden' : 'hidden xl:block')}>
                <span className="block truncate">{supportCase.requester.name}</span>
                <span className="mt-0.5 block truncate text-[10px] text-[var(--admin-text-muted)]">{supportCase.teamName}</span>
              </span>
              <span className={cn('min-w-0', showDesktopSupportWorkspace ? 'hidden' : 'hidden xl:block')}>
                <StatusPill label={statusLabels[supportCase.status]} tone={statusTone(supportCase.status)} />
                {isSupportUser ? (
                  <span className="mt-1 block truncate text-[10px] text-[var(--admin-text-muted)]">
                    {supportCase.assignedUser?.id === session?.user.id
                      ? 'Com voce'
                      : supportCase.assignedUser
                        ? supportCase.assignedUser.name
                        : 'Para assumir'}
                  </span>
                ) : null}
              </span>
              <span className="grid gap-1 pt-0.5 text-right text-[10.5px] text-[var(--admin-text-muted)] xl:pt-0">
                <span>{formatDate(supportCase.updatedAt)}</span>
                {isSupportUser ? <span className="hidden sm:block">{slaSignal.short}</span> : null}
              </span>
            </button>
          );
        }) : (
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
          ? 'h-[calc(100vh-178px)] min-h-0'
          : 'h-[calc(100svh-218px)] min-h-[430px] lg:h-[calc(100vh-178px)]',
      )}
    >
      <div
        className={cn(
          'grid min-h-0 flex-1 min-w-0',
          showDesktopManagementPanel ? 'lg:grid-cols-[minmax(0,1fr)_320px]' : 'lg:grid-cols-[minmax(0,1fr)]',
        )}
      >
        <div className="flex min-h-0 min-w-0 flex-col border-[var(--admin-border)] lg:border-r">
          <div className="grid gap-3 border-b border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2.5 py-2.5 sm:px-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateSupportRoute({ mode: 'list' })}
                  aria-label="Voltar para lista de atendimentos"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-[4px] border border-transparent text-[var(--admin-text-secondary)] transition hover:border-[var(--admin-border)] hover:bg-[var(--admin-surface-1)] hover:text-[var(--admin-text-primary)]"
                >
                  <ArrowLeft size={15} />
                </button>
                <span className="text-[13px] font-semibold text-[var(--admin-text-primary)]">{selectedCase.code}</span>
                <StatusPill label={priorityLabels[selectedCase.priority]} tone={selectedCase.priority === 'HIGH' || selectedCase.priority === 'URGENT' ? 'critical' : 'neutral'} />
                <StatusPill label={statusLabels[selectedCase.status]} tone={statusTone(selectedCase.status)} />
              </div>
              <h2 className="mt-2 truncate text-[18px] font-semibold leading-tight text-[var(--admin-text-primary)]">{selectedCase.title}</h2>
              <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-[var(--admin-text-secondary)]">
                {selectedCase.description ?? 'Sem detalhe informado'}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="inline-flex h-6 items-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-2 text-[10.5px] font-semibold text-[var(--admin-text-secondary)]">
                  {selectedCase.department?.name ?? 'Nao classificado'}
                </span>
                <span className="inline-flex h-6 items-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-2 text-[10.5px] font-semibold text-[var(--admin-text-secondary)]">
                  {selectedCase.topic?.name ?? 'Geral'}
                </span>
                <span className="inline-flex h-6 items-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-2 text-[10.5px] font-semibold text-[var(--admin-text-secondary)]">
                  {selectedCase.teamName}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-start justify-end gap-1.5">
              {primaryCaseAction ? (
                <button
                  type="button"
                  onClick={runPrimaryCaseAction}
                  disabled={updateMutation.isPending || sensitiveActionNeedsReason}
                  className="inline-flex h-8 items-center justify-center rounded-[4px] border border-[var(--admin-border-strong)] bg-[var(--admin-panel-active)] px-3 text-[10.5px] font-semibold text-[var(--admin-text-primary)] transition hover:bg-[var(--admin-surface-1)] disabled:opacity-50"
                >
                  {primaryCaseAction.label}
                </button>
              ) : null}
              <button
                type="button"
                className={supportIconButtonClass}
                aria-label="Copiar link do atendimento"
                onClick={() => {
                  if (typeof window !== 'undefined' && window.navigator.clipboard) {
                    void window.navigator.clipboard.writeText(window.location.href);
                  }
                }}
              >
                <Link size={14} />
              </button>
              <button
                type="button"
                className={supportIconButtonClass}
                aria-label="Atualizar atendimento"
                onClick={() => void detailQuery.refetch()}
              >
                <RefreshCcw size={14} />
              </button>
              {showDesktopSupportWorkspace ? (
                <>
                  <button
                    type="button"
                    onClick={() => setWorkspaceContextOpen((currentValue) => !currentValue)}
                    aria-label="Alternar contexto do atendimento"
                    aria-pressed={workspaceContextOpen}
                    className="hidden h-8 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-2.5 text-[10.5px] font-semibold text-[var(--admin-text-secondary)] transition hover:border-[var(--admin-border-strong)] hover:bg-[var(--admin-panel-active)] hover:text-[var(--admin-text-primary)] lg:inline-flex"
                  >
                    {workspaceContextOpen ? 'Contexto' : 'Ver contexto'}
                  </button>
                  <button type="button" className={supportIconButtonClass} aria-label="Mais acoes do atendimento">
                    <MoreHorizontal size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSupportRoute({ mode: 'list' })}
                    className="hidden h-8 items-center justify-center rounded-[4px] border border-[var(--admin-danger-border)] bg-transparent px-2.5 text-[10.5px] font-semibold text-[var(--admin-danger-text)] transition hover:bg-[var(--admin-danger-bg)] lg:inline-flex"
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
                  Detalhes
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
                    actionComment=""
                    ratingScore={ratingScore}
                    ratingComment={ratingComment}
                    updatePending={false}
                    updateError={null}
                    ratingPending={ratingMutation.isPending}
                    sensitiveActionNeedsReason={false}
                    onTeamTransfer={() => undefined}
                    onActionReasonChange={() => undefined}
                    onActionCommentChange={() => undefined}
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
              <div className="hidden border-b border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-3 lg:flex">
                <button
                  type="button"
                  className="relative h-10 px-2 text-[11px] font-semibold text-[var(--admin-accent-text)] after:absolute after:inset-x-1 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[var(--admin-border-strong)]"
                >
                  Conversa
                  <span className="ml-1.5 rounded-[4px] bg-[var(--admin-surface-2)] px-1.5 py-0.5 text-[9.5px] text-[var(--admin-text-primary)]">
                    {selectedCaseMessages.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setWorkspaceContextOpen(true)}
                  className="h-10 px-2 text-[11px] font-semibold text-[var(--admin-text-secondary)] transition hover:text-[var(--admin-text-primary)]"
                >
                  Detalhes
                </button>
              </div>
              <SupportConversation
                loading={detailQuery.isLoading}
                openingText={selectedCase.description}
                requesterName={selectedCase.requester.name}
                events={selectedCaseEvents}
                messages={selectedCaseMessages}
              />

              <form onSubmit={handleAddMessage} className="border-t border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-2.5">
                <label className="flex min-h-10 min-w-0 items-end gap-2 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-2.5 py-1.5 text-[12px] text-[var(--admin-text-secondary)] focus-within:border-[var(--admin-border-strong)]">
                  <textarea
                    aria-label="Adicionar mensagem ao atendimento"
                    placeholder="Responder ao atendimento..."
                    value={messageDraft}
                    onChange={(event) => setMessageDraft(event.currentTarget.value)}
                    rows={1}
                    className="max-h-24 min-h-8 min-w-0 flex-1 resize-none bg-transparent py-1 text-[12px] leading-5 text-[var(--admin-text-primary)] outline-none placeholder:text-[var(--admin-text-muted)]"
                  />
                  <span className="hidden items-center gap-1 sm:flex">
                    <button type="button" disabled className="flex h-8 w-8 items-center justify-center rounded-[4px] text-[var(--admin-text-muted)] opacity-55" aria-label="Anexar arquivo indisponivel">
                      <Paperclip size={14} />
                    </button>
                    <button type="button" disabled className="flex h-8 w-8 items-center justify-center rounded-[4px] text-[var(--admin-text-muted)] opacity-55" aria-label="Reacoes indisponiveis">
                      <Smile size={14} />
                    </button>
                    <button type="button" disabled className="flex h-8 w-8 items-center justify-center rounded-[4px] text-[var(--admin-text-muted)] opacity-55" aria-label="Formatacao indisponivel">
                      <Type size={14} />
                    </button>
                  </span>
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
              actionComment={actionComment}
              ratingScore={ratingScore}
              ratingComment={ratingComment}
              updatePending={updateMutation.isPending}
              updateError={updateMutation.isError ? updateMutation.error.message : null}
              ratingPending={ratingMutation.isPending}
              sensitiveActionNeedsReason={sensitiveActionNeedsReason}
              onTeamTransfer={handleTeamTransfer}
              onActionReasonChange={setActionReason}
              onActionCommentChange={setActionComment}
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
              actionComment={actionComment}
              ratingScore={ratingScore}
              ratingComment={ratingComment}
              updatePending={updateMutation.isPending}
              updateError={updateMutation.isError ? updateMutation.error.message : null}
              ratingPending={ratingMutation.isPending}
              sensitiveActionNeedsReason={sensitiveActionNeedsReason}
              onTeamTransfer={handleTeamTransfer}
              onActionReasonChange={setActionReason}
              onActionCommentChange={setActionComment}
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

  const showSupportPageToolbar = viewMode !== 'detail' || showDesktopSupportWorkspace;

  return (
    <main className="grid w-full gap-2">
      {showSupportPageToolbar ? (
        <section className="rounded-[6px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-2.5 text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)] backdrop-blur-[2px]">
        <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          {viewMode === 'list' ? (
            <div className="grid min-w-0 gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--admin-text-muted)]">
                  Atendimentos / {isSupportUser ? queueViewLabel(operatorQueueView) : 'Todos'}
                </p>
                <h1 className="mt-1 truncate text-[20px] font-semibold leading-tight text-[var(--admin-text-primary)]">
                  {isSupportUser ? queueViewLabel(operatorQueueView) : 'Meus atendimentos'}
                </h1>
                <p className="mt-0.5 text-[12px] text-[var(--admin-text-secondary)]">
                  {cases.length} itens. Atualizado agora.
                </p>
              </div>
              <div className="grid min-w-0 gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(220px,280px)] lg:items-center">
                {isSupportUser ? (
                  operatorQueueTabs
                ) : (
                  <div className={filterGridClass}>
                    {listToolbarFilters.map((filter) => (
                      <button
                        key={filter.id}
                        type="button"
                        aria-pressed={activeFilter === filter.id}
                        onClick={() => setActiveFilter(filter.id as SupportCaseFilter)}
                        className={cn(
                          filterButtonBaseClass,
                          activeFilter === filter.id
                            ? filterButtonActiveClass
                            : filterButtonIdleClass,
                        )}
                      >
                        <span className="truncate">{filter.label}</span>
                        <span className="text-current/70">{filter.value}</span>
                      </button>
                    ))}
                  </div>
                )}
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
      ) : null}

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
        <div className="grid min-h-0 gap-2 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
          <div className="hidden min-h-0 lg:block">
            {casesListCard}
          </div>
          {selectedCaseDetailCard}
        </div>
      ) : null}

      {!showDesktopSupportWorkspace && viewMode === 'list' ? (
        isSupportUser ? (
          <div className="grid min-h-0 gap-2">
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

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return query.includes('min-width');
    }

    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(query);
    const handleChange = () => setMatches(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
}

function WorkQueueTabs({
  items,
  onSelect,
}: {
  items: Array<{
    id: SupportOperatorQueueView;
    label: string;
    count: number;
    active: boolean;
  }>;
  onSelect: (queueView: SupportOperatorQueueView) => void;
}) {
  return (
    <div className="flex min-w-0 flex-wrap gap-1.5" aria-label="Filas de atendimento">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={item.active}
          onClick={() => onSelect(item.id)}
          className={cn(
            filterButtonBaseClass,
            item.active ? filterButtonActiveClass : filterButtonIdleClass,
          )}
        >
          <span className="truncate">{item.label}</span>
          <span className="text-current/70">{item.count}</span>
        </button>
      ))}
    </div>
  );
}

function SupportCaseDetails({
  supportCase,
  fieldValues,
  isSupportUser,
  teams,
  actionReason,
  actionComment,
  ratingScore,
  ratingComment,
  updatePending,
  updateError,
  ratingPending,
  sensitiveActionNeedsReason,
  onTeamTransfer,
  onActionReasonChange,
  onActionCommentChange,
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
  actionReason: SupportTransferReason | SupportResolutionReason | '';
  actionComment: string;
  ratingScore: number;
  ratingComment: string;
  updatePending: boolean;
  updateError: string | null;
  ratingPending: boolean;
  sensitiveActionNeedsReason: boolean;
  onTeamTransfer: (teamCode: string) => void;
  onActionReasonChange: (value: SupportTransferReason | SupportResolutionReason) => void;
  onActionCommentChange: (value: string) => void;
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
            value={actionReason}
            onChange={(event) => onActionReasonChange(event.currentTarget.value as SupportTransferReason | SupportResolutionReason)}
            aria-label="Motivo da acao"
            className="h-8 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-2 text-[11px] font-semibold text-[var(--admin-text-primary)] outline-none"
          >
            {actionReasonOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
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
            value={actionComment}
            onChange={(event) => onActionCommentChange(event.currentTarget.value)}
            aria-label="Detalhe da acao"
            placeholder="Detalhe opcional para auditoria"
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
    ...events
      .filter((event) => !isMessageAuditEvent(event.type))
      .map((event) => ({
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
    <div className="admin-scrollbar min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgba(255,255,255,0.018),transparent_28%),radial-gradient(circle_at_18%_10%,rgba(155,31,46,0.08),transparent_26%)] px-3 py-3">
      <div className="grid gap-3">
        {conversationItems.map((item) => (
          item.type === 'event' ? (
            <div key={`${item.type}-${item.id}`} className="mx-auto max-w-[86%] rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-2.5 py-1 text-center">
              <p className="text-[10px] font-semibold text-[var(--admin-text-secondary)]">{item.title}</p>
              <p className="mt-0.5 text-[9.5px] text-[var(--admin-text-muted)]">
                {formatDate(item.date)}
                {item.detail ? ` - ${item.detail}` : ''}
              </p>
            </div>
          ) : (
            <div
              key={`${item.type}-${item.id}`}
              className={cn('flex items-start gap-2', item.mine ? 'justify-end' : 'justify-start')}
            >
              {!item.mine ? <MessageAvatar name={item.title} /> : null}
              <div
                className={cn(
                  'max-w-[88%] rounded-[5px] border px-2.5 py-2 sm:max-w-[74%]',
                  item.mine
                    ? 'border-[var(--admin-border-strong)] bg-[var(--admin-panel-active)] shadow-[0_12px_26px_-24px_rgba(155,31,46,0.85)]'
                    : 'border-[var(--admin-border)] bg-[var(--admin-surface-2)] shadow-[0_12px_26px_-24px_rgba(0,0,0,0.65)]',
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-[11px] font-semibold text-[var(--admin-text-primary)]">
                    {item.mine ? 'Voce' : item.title}
                  </p>
                  <div className="flex shrink-0 items-center gap-1.5 text-[9.5px] text-[var(--admin-text-muted)]">
                    <span>{formatDate(item.date)}</span>
                    {item.mine ? <MessageDeliveryIndicator /> : null}
                  </div>
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-[12px] leading-5 text-[var(--admin-text-primary)]">
                  {item.detail}
                </p>
              </div>
              {item.mine ? <MessageAvatar name={item.title} muted /> : null}
            </div>
          )
        ))}
      </div>
    </div>
  );
}

function MessageAvatar({ name, muted = false }: { name: string; muted?: boolean }) {
  return (
    <span
      className={cn(
        'mt-1 hidden h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold sm:flex',
        muted
          ? 'border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)]'
          : 'border-[var(--admin-border-strong)] bg-[var(--admin-surface-1)] text-[var(--admin-text-primary)]',
      )}
      aria-hidden="true"
    >
      {initialsFromName(name)}
    </span>
  );
}

function MessageDeliveryIndicator() {
  return (
    <span
      className="inline-flex items-center text-[var(--admin-accent-text)]"
      title="Mensagem enviada"
      aria-label="Mensagem enviada"
    >
      <CheckCheck size={13} strokeWidth={1.8} />
    </span>
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
    'para-assumir': 'Para assumir',
    'meus-atendimentos': 'Meus atendimentos',
    'da-equipe': 'Da equipe',
    'sla-critico': 'SLA critico',
    todos: 'Todos',
  };

  return labels[queueView];
}

function supportPrimaryCaseAction(
  supportCase: SupportCaseListItem,
  currentUserId: string,
): { label: string; action: 'assign' | 'open' | 'resolve' | 'close' } | null {
  if (supportCase.status === 'CLOSED') {
    return null;
  }

  if (!supportCase.assignedUser || supportCase.assignedUser.id !== currentUserId) {
    return { label: 'Assumir', action: 'assign' };
  }

  if (
    supportCase.status === 'WAITING_REQUESTER' ||
    supportCase.status === 'WAITING_INTERNAL' ||
    supportCase.status === 'WAITING_APPROVAL'
  ) {
    return { label: 'Retomar', action: 'open' };
  }

  if (supportCase.status === 'RESOLVED') {
    return { label: 'Fechar', action: 'close' };
  }

  return { label: 'Resolver', action: 'resolve' };
}

function transferReasonForAction(reason: SupportTransferReason | SupportResolutionReason): SupportTransferReason {
  return (transferReasons.has(reason) ? reason : 'OTHER') as SupportTransferReason;
}

function resolutionReasonForStatus(
  status: SupportCaseStatus,
  reason: SupportTransferReason | SupportResolutionReason,
): SupportResolutionReason | undefined {
  if (status !== 'RESOLVED' && status !== 'CLOSED') {
    return undefined;
  }

  if (resolutionReasons.has(reason)) {
    return reason as SupportResolutionReason;
  }

  return status === 'RESOLVED' ? 'RESOLVED' : 'NO_REQUESTER_RETURN';
}

function supportCaseSlaSignal(supportCase: SupportCaseListItem): {
  label: string;
  short: string;
  tone: 'neutral' | 'warning' | 'critical';
} {
  if (!supportCase.dueAt) {
    return { label: 'SLA sem prazo', short: 'Sem prazo', tone: 'neutral' };
  }

  const dueAt = Date.parse(supportCase.dueAt);
  if (!Number.isFinite(dueAt)) {
    return { label: 'SLA sem prazo', short: 'Sem prazo', tone: 'neutral' };
  }

  const minutes = Math.round((dueAt - Date.now()) / 60_000);
  if (minutes < 0) {
    return { label: `SLA vencido ${elapsedDurationLabel(Math.abs(minutes))}`, short: 'SLA vencido', tone: 'critical' };
  }

  if (minutes <= 240) {
    return { label: `SLA vence ${durationLabel(minutes)}`, short: 'SLA proximo', tone: 'warning' };
  }

  return { label: `SLA ${durationLabel(minutes)}`, short: 'SLA no prazo', tone: 'neutral' };
}

function durationLabel(totalMinutes: number) {
  if (totalMinutes < 60) {
    return `em ${Math.max(totalMinutes, 1)}min`;
  }

  const hours = Math.round(totalMinutes / 60);
  if (hours < 24) {
    return `em ${hours}h`;
  }

  return `em ${Math.round(hours / 24)}d`;
}

function elapsedDurationLabel(totalMinutes: number) {
  if (totalMinutes < 60) {
    return `ha ${Math.max(totalMinutes, 1)}min`;
  }

  const hours = Math.round(totalMinutes / 60);
  if (hours < 24) {
    return `ha ${hours}h`;
  }

  return `ha ${Math.round(hours / 24)}d`;
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
    const urgent = supportCase.priority === 'HIGH' || supportCase.priority === 'URGENT';
    const criticalSla = supportCaseSlaSignal(supportCase).tone === 'critical';

    if (queueView === 'para-assumir') {
      return !resolved && unassigned;
    }

    if (queueView === 'meus-atendimentos') {
      return !resolved && mine;
    }

    if (queueView === 'da-equipe') {
      return !resolved;
    }

    if (queueView === 'sla-critico') {
      return !resolved && (urgent || criticalSla);
    }

    return true;
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
      id: 'para-assumir',
      label: 'Para assumir',
      description: 'Sem atendente definido',
    },
    {
      id: 'meus-atendimentos',
      label: 'Meus atendimentos',
      description: 'Responsabilidade atual',
    },
    {
      id: 'da-equipe',
      label: 'Da equipe',
      description: 'Ativos da sua area',
    },
    {
      id: 'sla-critico',
      label: 'SLA critico',
      description: 'Prazo vencido ou urgente',
    },
    {
      id: 'todos',
      label: 'Todos',
      description: 'Consulta geral',
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

function initialsFromName(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return (parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '');
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

function isMessageAuditEvent(type: string) {
  return type === 'COMMENTED' || type === 'LINKED_MESSAGE';
}

function eventValueLabel(type: string, value: string) {
  if (type === 'COMMENTED' || type === 'LINKED_MESSAGE') {
    return 'conteudo registrado';
  }

  return value;
}
