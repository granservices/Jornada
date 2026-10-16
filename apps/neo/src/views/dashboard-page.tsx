import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { Virtuoso } from 'react-virtuoso';
import {
  ArrowDownUp,
  BriefcaseBusiness,
  ArrowDown,
  ArrowUp,
  Bell,
  CalendarClock,
  ChevronDown,
  FileText,
  Funnel,
  GraduationCap,
  IdCard,
  KeyRound,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  RotateCcw,
  Save,
  Search,
  Send,
  ShieldCheck,
  ShipWheel,
  Stethoscope,
  UserRound,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { ListAction } from '../components/ui/list-action';
import { SelectField, type Key } from '../components/ui/select-field';
import { SectionCard } from '../components/ui/section-card';
import { StatusPill } from '../components/ui/status-pill';
import { TextField } from '../components/ui/text-field';
import {
  listChatConversations,
  listChatMessages,
  markChatConversationRead,
  sendChatMessage,
  type ChatConversationFilter,
  type ChatMessage,
} from '../features/chat/chat-api';
import type { InboxItem as ContractInboxItem, RequirementExpiration, ScheduleItem } from '../features/contracts/internal-contracts';
import { internalContractFixtures } from '../features/contracts/internal-contract-fixtures';
import { useChatSocket } from '../features/chat/use-chat-socket';
import { getAuthSessionSnapshot } from '../features/auth/auth-session';
import {
  listDrakeWorkerPreview,
  listMySchedule,
} from '../features/schedule/schedule-api';
import { useAdminWorkerPreview } from '../features/admin-worker-preview/admin-worker-preview-context';
import { listMyRequirements, listRequirementPreview } from '../features/requirements/requirements-api';
import { listSupportCases, type SupportCaseListItem } from '../modules/tickets/support-api';
import {
  getMyProfile,
  updateMyProfile,
  type MyProfile,
  type ProfileNotificationChannel,
  type UpdateMyProfilePayload,
} from '../features/profile/profile-api';
import {
  priorityToneFromContract,
  requirementDueLabelFromContract,
} from '../features/requirements/requirements-view-model';
import { cn } from '../lib/cn';

type InboxTone = 'neutral' | 'warning' | 'critical';
type InboxType = 'embarque' | 'desembarque' | 'treinamento' | 'aso' | 'compromisso' | 'mensagem';
type InboxFilter = 'action' | 'updates' | 'messages' | 'all';
type InboxCategory = Exclude<InboxFilter, 'all'>;
type ChatFilter = ChatConversationFilter;
type ProfileTab = 'identity' | 'contact' | 'access' | 'documents';

type InboxItem = {
  id: string;
  type: InboxType;
  title: string;
  summary: string;
  when: string;
  dueKey: string | null;
  source: string;
  status: string;
  tone: InboxTone;
  action: string;
  actionTo: string;
};

const inboxTypeMeta: Record<InboxType, { label: string; icon: typeof CalendarClock }> = {
  embarque: { label: 'Embarque', icon: ShipWheel },
  desembarque: { label: 'Desembarque', icon: CalendarClock },
  treinamento: { label: 'Treinamento', icon: GraduationCap },
  aso: { label: 'ASO', icon: Stethoscope },
  compromisso: { label: 'Compromisso', icon: BriefcaseBusiness },
  mensagem: { label: 'Mensagem', icon: MessageSquareText },
};

const filterGridClass = 'grid min-w-0 grid-cols-2 gap-1.5 sm:flex sm:flex-wrap';
const filterButtonBaseClass =
  'inline-flex h-9 min-w-0 items-center justify-center gap-2 border-b-2 border-transparent px-1.5 text-[13px] font-medium leading-none transition sm:w-auto sm:flex-none sm:px-2.5';
const filterButtonActiveClass =
  'border-[var(--admin-border-strong)] bg-transparent font-semibold text-[var(--admin-border-strong)]';
const filterButtonIdleClass =
  'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]';
const searchFieldClass =
  'flex h-10 min-w-0 items-center gap-2 rounded-[3px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 text-[12px] text-[var(--admin-text-secondary)] transition focus-within:border-[var(--admin-border-strong)] focus-within:bg-[var(--admin-surface-2)]';
const inboxControlButtonClass =
  'inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-[3px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 text-[12px] font-semibold text-[var(--admin-text-secondary)] transition hover:border-[var(--admin-border-strong)] hover:text-[var(--admin-text-primary)]';

const employeeProfile = internalContractFixtures.employeeProfile;
const userAccessContext = internalContractFixtures.userAccessContext;

const inboxItems: InboxItem[] = internalContractFixtures.inboxItems.map((item: ContractInboxItem) => ({
  id: item.inboxItemId,
  type: inboxTypeFromContract(item),
  title: item.title,
  summary: item.summary,
  when: inboxWhenFromContract(item),
  dueKey: item.dueAt?.slice(0, 10) ?? null,
  source: inboxSourceFromContract(item),
  status: inboxStatusFromContract(item),
  tone: priorityToneFromContract(item.priority),
  action: inboxActionFromContract(item),
  actionTo: item.route,
}));

function inboxCategory(item: InboxItem): InboxCategory {
  if (item.type === 'mensagem') {
    return 'messages';
  }

  if (item.type === 'treinamento' || item.type === 'aso' || item.tone === 'critical') {
    return 'action';
  }

  return 'updates';
}

function inboxTypeFromContract(item: ContractInboxItem): InboxType {
  if (item.kind === 'support' || item.kind === 'communication') {
    return 'mensagem';
  }

  if (item.kind === 'requirement') {
    return item.title.toLocaleLowerCase('pt-BR').includes('aso') ? 'aso' : 'treinamento';
  }

  if (item.relatedId.includes('disembarking')) {
    return 'desembarque';
  }

  if (item.relatedId.includes('medical')) {
    return 'compromisso';
  }

  if (item.relatedId.includes('training')) {
    return 'treinamento';
  }

  return 'embarque';
}

function inboxWhenFromContract(item: ContractInboxItem) {
  const labels: Record<string, string> = {
    inbox_schedule_001: '24 ago • 05:40',
    inbox_requirement_001: '3 dias',
    inbox_support_001: 'ha 8 min',
    inbox_aso_001: '6 dias',
    inbox_medical_001: '27 ago',
  };

  return labels[item.inboxItemId] ?? 'pendente';
}

function inboxSourceFromContract(item: ContractInboxItem) {
  if (item.kind === 'support') {
    return 'Operacoes';
  }

  if (item.title.toLocaleLowerCase('pt-BR').includes('aso') || item.relatedId.includes('medical')) {
    return 'Medicina';
  }

  if (item.kind === 'requirement') {
    return 'Treinamento';
  }

  return 'Operacoes';
}

function inboxStatusFromContract(item: ContractInboxItem) {
  if (item.kind === 'support') {
    return 'nova';
  }

  if (item.priority === 'critical') {
    return 'atencao';
  }

  if (item.title.toLocaleLowerCase('pt-BR').includes('aso')) {
    return 'agendar';
  }

  if (item.relatedId.includes('medical')) {
    return 'reservado';
  }

  return 'confirmado';
}

function inboxActionFromContract(item: ContractInboxItem) {
  if (item.kind === 'support') {
    return 'Abrir atendimento';
  }

  if (item.route.startsWith('/vencimentos') && item.title.toLocaleLowerCase('pt-BR').includes('aso')) {
    return 'Ver horarios';
  }

  if (item.route.startsWith('/vencimentos')) {
    return 'Abrir treinamento';
  }

  if (item.relatedId.includes('medical')) {
    return 'Ver compromisso';
  }

  return 'Ver programação';
}

const profileNotificationChannelOptions = [
  { id: 'EMAIL', label: 'Email', description: 'Avisos enviados para o email da conta.' },
  { id: 'PHONE', label: 'Telefone', description: 'Contato direto pelo numero informado.' },
  { id: 'WHATSAPP', label: 'WhatsApp', description: 'Preferencia para mensagens pelo telefone.' },
  { id: 'NONE', label: 'Sem preferencia', description: 'Manter apenas comunicacoes obrigatorias.' },
];

const profileTabs: Array<{ id: ProfileTab; label: string; icon: typeof UserRound }> = [
  { id: 'identity', label: 'Identidade', icon: UserRound },
  { id: 'contact', label: 'Contato', icon: Phone },
  { id: 'access', label: 'Acesso', icon: KeyRound },
  { id: 'documents', label: 'Documentos', icon: FileText },
];

const monthLabels = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

const profileDocuments = internalContractFixtures.requirementExpirations.slice(0, 3).map((item) => ({
  label: item.title,
  value: requirementDueLabelFromContract(item),
  tone: priorityToneFromContract(item.severity),
}));

function toInboxItems(
  scheduleItems: ScheduleItem[],
  requirements: Array<Omit<RequirementExpiration, 'employeeId'> | RequirementExpiration>,
  supportCases: SupportCaseListItem[] = [],
): InboxItem[] {
  const nextScheduleItem = nextBoardingOrDisembarking(scheduleItems);
  const scheduleInboxItems = nextScheduleItem ? [nextScheduleItem].flatMap((item): InboxItem[] => {
    const type = scheduleTypeFromContract(item.type);

    return [{
      id: item.scheduleItemId,
      type,
      title: item.title,
      summary: item.location,
      when: formatContractDate(item.startsAt),
      dueKey: item.startsAt.slice(0, 10),
      source: item.sourceLabel,
      status: scheduleStatusFromContract(item),
      tone: item.status === 'PENDING' || item.status === 'CHANGED' ? 'warning' : 'neutral',
      action: item.action.label,
      actionTo: item.action.route,
    }];
  }) : [];

  const requirementInboxItems = requirements
    .filter(isTrainingRequirementDueWithin120Days)
    .map((item): InboxItem => {
      const attention = inboxRequirementAttention(item);

      return {
        id: item.requirementId,
        type: 'treinamento',
        title: item.title,
        summary: requirementDueLabelFromContract(item),
        when: formatContractDate(item.expiresAt),
        dueKey: item.expiresAt?.slice(0, 10) ?? null,
        source: item.issuerLabel,
        status: attention.status,
        tone: attention.tone,
        action: 'Ver treinamento',
        actionTo: item.action.route,
      };
    });

  const supportInboxItems = supportCases
    .map(supportCaseInboxAction)
    .filter((item): item is InboxItem => Boolean(item));

  return [...scheduleInboxItems, ...requirementInboxItems, ...supportInboxItems]
    .sort((first, second) => (first.dueKey ?? '9999-12-31').localeCompare(second.dueKey ?? '9999-12-31'));
}

function supportCaseInboxAction(supportCase: SupportCaseListItem): InboxItem | null {
  if (supportCase.status === 'WAITING_REQUESTER') {
    return {
      id: `support-${supportCase.id}`,
      type: 'mensagem',
      title: supportCase.title,
      summary: supportCase.description ?? 'O setor respondeu e aguarda seu retorno.',
      when: formatChatTime(supportCase.updatedAt),
      dueKey: supportCase.updatedAt.slice(0, 10),
      source: supportCase.department?.name ?? supportCase.teamName,
      status: 'resposta',
      tone: 'warning',
      action: 'Responder',
      actionTo: `/atendimento?caso=${supportCase.id}`,
    };
  }

  if (supportCase.status === 'RESOLVED' && !supportCase.rating && isRecentlyResolvedSupportCase(supportCase)) {
    return {
      id: `support-rating-${supportCase.id}`,
      type: 'mensagem',
      title: supportCase.title,
      summary: 'O atendimento foi resolvido. Avalie ou reabra se ainda precisar de retorno.',
      when: formatChatTime(supportCase.resolvedAt ?? supportCase.updatedAt),
      dueKey: (supportCase.resolvedAt ?? supportCase.updatedAt).slice(0, 10),
      source: supportCase.department?.name ?? supportCase.teamName,
      status: 'avaliar',
      tone: 'neutral',
      action: 'Avaliar',
      actionTo: `/atendimento?caso=${supportCase.id}`,
    };
  }

  return null;
}

function isRecentlyResolvedSupportCase(supportCase: SupportCaseListItem) {
  if (!supportCase.resolvedAt) {
    return false;
  }

  const resolvedAt = Date.parse(supportCase.resolvedAt);
  return Number.isFinite(resolvedAt) && Date.now() - resolvedAt <= 7 * 86_400_000;
}

function nextBoardingOrDisembarking(items: ScheduleItem[]) {
  const now = Date.now();

  return items
    .filter((item) => item.type === 'BOARDING' || item.type === 'DISEMBARKING')
    .filter((item) => Date.parse(item.startsAt) >= now)
    .sort((first, second) => Date.parse(first.startsAt) - Date.parse(second.startsAt))[0] ?? null;
}

function isTrainingRequirementDueWithin120Days(item: Omit<RequirementExpiration, 'employeeId'> | RequirementExpiration) {
  if (item.type !== 'TRAINING' || !item.expiresAt) {
    return false;
  }

  const daysToExpire = Math.ceil((Date.parse(item.expiresAt) - Date.now()) / 86_400_000);
  return daysToExpire <= 120;
}

function inboxRequirementAttention(item: Omit<RequirementExpiration, 'employeeId'> | RequirementExpiration): {
  status: string;
  tone: InboxTone;
} {
  if (!item.expiresAt) {
    return { status: 'Sem data', tone: 'neutral' };
  }

  const expiresAt = Date.parse(item.expiresAt);
  if (expiresAt < Date.now() || item.status === 'EXPIRED') {
    return { status: 'Vencido', tone: 'critical' };
  }

  return { status: 'Próximo do vencimento', tone: 'warning' };
}

function inboxScheduleRange() {
  const from = new Date();
  const to = new Date();
  from.setUTCDate(from.getUTCDate() - 60);
  to.setUTCDate(to.getUTCDate() + 60);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

function programacaoScheduleRange() {
  const from = new Date();
  const to = new Date();
  from.setUTCDate(from.getUTCDate() - 60);
  to.setUTCDate(to.getUTCDate() + 60);

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function formatContractDate(value: string | null) {
  if (!value) {
    return 'Sem data';
  }

  const date = new Date(value);
  return `${String(date.getUTCDate()).padStart(2, '0')} ${monthLabels[date.getUTCMonth()].toLocaleLowerCase('pt-BR')}`;
}

type ScheduleStatus = 'confirmado' | 'atencao' | 'concluido' | 'cancelado';
type ScheduleType = 'embarque' | 'desembarque' | 'compromisso';
type ProgramacaoFilter = 'all' | ScheduleType;

const currentProgramacaoDate = new Date();
const programacaoYear = currentProgramacaoDate.getFullYear();
const currentProgramacaoMonthIndex = currentProgramacaoDate.getMonth();
const currentProgramacaoDay = currentProgramacaoDate.getDate();
const currentProgramacaoDateKey = dateKeyFromParts(
  programacaoYear,
  currentProgramacaoMonthIndex,
  currentProgramacaoDay,
);

type TimelineScheduleItem = {
  id: string;
  type: ScheduleType;
  title: string;
  route: string;
  isoDate: string;
  date: string;
  time: string;
  status: ScheduleStatus;
  tone: InboxTone;
  period: 'future' | 'past';
};

const scheduleItems: TimelineScheduleItem[] = internalContractFixtures.scheduleItems.map((item: ScheduleItem) => {
  const isPrimaryBoarding = item.scheduleItemId === 'schedule_boarding_001';
  const isoDate = isPrimaryBoarding ? currentProgramacaoDateKey : item.startsAt.slice(0, 10);
  const date = isPrimaryBoarding
    ? `${String(currentProgramacaoDay).padStart(2, '0')} ${monthLabels[currentProgramacaoMonthIndex].toLocaleLowerCase('pt-BR')}`
    : formatContractDate(item.startsAt);

  return {
    id: item.scheduleItemId,
    type: scheduleTypeFromContract(item.type),
    title: item.title,
    route: item.location,
    isoDate,
    date,
    time: scheduleTimeFromContract(item),
    status: scheduleStatusFromContract(item),
    tone: item.status === 'PENDING' || item.status === 'CHANGED' ? 'warning' : 'neutral',
    period: isPrimaryBoarding || item.startsAt >= '2026-08-27T00:00:00.000Z' ? 'future' : 'past',
  };
});

function toTimelineScheduleItems(items: ScheduleItem[]): TimelineScheduleItem[] {
  return items.flatMap((item) => {
    const type = scheduleTypeFromContract(item.type);
    if (!type) return [];
    const isoDate = item.startsAt.slice(0, 10);
    const date = formatContractDate(item.startsAt);

    return [{
      id: item.scheduleItemId,
      type,
      title: item.title,
      route: item.location,
      isoDate,
      date,
      time: scheduleTimeFromContract(item),
      status: scheduleStatusFromContract(item),
      tone: item.status === 'PENDING' || item.status === 'CHANGED' ? 'warning' : 'neutral',
      period: item.startsAt >= new Date().toISOString() ? 'future' : 'past',
    }];
  });
}

function scheduleTypeFromContract(type: ScheduleItem['type']): ScheduleType {
  if (type === 'BOARDING') {
    return 'embarque';
  }

  if (type === 'DISEMBARKING') {
    return 'desembarque';
  }

  return 'compromisso';
}

function scheduleStatusFromContract(item: ScheduleItem): ScheduleStatus {
  if (item.status === 'PENDING' || item.status === 'CHANGED') {
    return 'atencao';
  }

  if (item.status === 'CANCELED') {
    return 'cancelado';
  }

  return item.startsAt < '2026-08-27T00:00:00.000Z' ? 'concluido' : 'confirmado';
}

function scheduleTimeFromContract(item: ScheduleItem) {
  if (item.scheduleItemId === 'schedule_boarding_001') {
    return '05:40';
  }

  if (item.scheduleItemId === 'schedule_medical_001') {
    return 'manhã';
  }

  const date = new Date(item.startsAt);
  return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
}

function dateKeyFromParts(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function scheduleTypeLabel(type: ScheduleType) {
  const labels: Record<ScheduleType, string> = {
    embarque: 'Embarque',
    desembarque: 'Desembarque',
    compromisso: 'Compromisso',
  };

  return labels[type];
}

export function InboxPage() {
  const [activeFilter, setActiveFilter] = useState<InboxFilter>('action');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const session = getAuthSessionSnapshot();
  const { selectedWorker } = useAdminWorkerPreview();
  const scheduleRange = useMemo(() => inboxScheduleRange(), []);
  const isAdmin = session?.user.roles.includes('ADMIN') ?? false;
  const canLoadOwnItems = Boolean(session) && !isAdmin;
  const canLoadPreviewItems = Boolean(session) && isAdmin && Boolean(selectedWorker);
  const canLoadOperationalItems = canLoadOwnItems || canLoadPreviewItems;
  const scheduleQuery = useQuery({
    queryKey: ['inbox', 'schedule', selectedWorker?.previewReference ?? 'me', scheduleRange.from, scheduleRange.to],
    queryFn: () => selectedWorker ? listDrakeWorkerPreview(selectedWorker.previewReference, scheduleRange) : listMySchedule(),
    enabled: canLoadOperationalItems,
    staleTime: 60_000,
  });
  const requirementsQuery = useQuery({
    queryKey: ['inbox', 'requirements', selectedWorker?.previewReference ?? 'me'],
    queryFn: () => selectedWorker ? listRequirementPreview(selectedWorker.previewReference) : listMyRequirements(),
    enabled: canLoadOperationalItems,
    staleTime: 60_000,
  });
  const supportCasesQuery = useQuery({
    queryKey: ['inbox', 'support-responses'],
    queryFn: () => listSupportCases({ filter: 'all', q: '' }),
    enabled: canLoadOwnItems,
    staleTime: 60_000,
  });
  const sourceInboxItems = !canLoadOperationalItems && !canLoadOwnItems
    ? inboxItems
    : toInboxItems(
      scheduleQuery.data?.items ?? [],
      requirementsQuery.data?.items ?? [],
      supportCasesQuery.data?.items ?? [],
    );

  const inboxFilters = useMemo(
    () => [
      { id: 'action' as const, label: 'Ação', value: sourceInboxItems.filter((item) => inboxCategory(item) === 'action').length },
      { id: 'updates' as const, label: 'Atualizações', value: sourceInboxItems.filter((item) => inboxCategory(item) === 'updates').length },
      { id: 'messages' as const, label: 'Mensagens', value: sourceInboxItems.filter((item) => item.type === 'mensagem').length },
      { id: 'all' as const, label: 'Tudo', value: sourceInboxItems.length },
    ],
    [sourceInboxItems],
  );

  const visibleItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('pt-BR');

    return sourceInboxItems.filter((item) => {
      const matchesFilter =
        activeFilter === 'all' ||
        (activeFilter === 'action' && inboxCategory(item) === 'action') ||
        (activeFilter === 'updates' && inboxCategory(item) === 'updates') ||
        (activeFilter === 'messages' && item.type === 'mensagem');

      if (!matchesFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [item.title, item.summary, item.source, item.status, inboxTypeMeta[item.type].label]
        .join(' ')
        .toLocaleLowerCase('pt-BR')
        .includes(normalizedSearch);
    });
  }, [activeFilter, searchTerm, sourceInboxItems]);
  const selectedItem = useMemo(
    () => visibleItems.find((item) => item.id === selectedItemId) ?? visibleItems[0] ?? null,
    [selectedItemId, visibleItems],
  );
  return (
    <main className="grid w-full gap-3 lg:h-full lg:min-h-0 lg:grid-rows-[auto_minmax(0,1fr)]">
      <section className="bg-transparent text-[var(--admin-text-primary)]">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div className={filterGridClass}>
            {inboxFilters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                aria-pressed={activeFilter === filter.id}
                onClick={() => setActiveFilter(filter.id)}
                style={activeFilter === filter.id ? { color: 'var(--admin-border-strong)', fontWeight: 700 } : undefined}
                className={cn(
                  filterButtonBaseClass,
                  activeFilter === filter.id ? filterButtonActiveClass : filterButtonIdleClass,
                )}
              >
                <span className="truncate">{filter.label}</span>
                <span className="text-current/70">{filter.value}</span>
              </button>
            ))}
          </div>
          <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(13rem,20rem)_auto_auto]">
            <label className={searchFieldClass}>
              <Search size={17} className="shrink-0 text-[var(--admin-text-muted)]" />
              <input
                type="search"
                aria-label="Buscar no Inbox"
                placeholder="Buscar no inbox"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.currentTarget.value)}
                className="min-w-0 flex-1 bg-transparent text-[12px] text-[var(--admin-text-primary)] outline-none placeholder:text-[var(--admin-text-secondary)]"
              />
              <span className="hidden h-5 items-center rounded-[3px] bg-[var(--admin-surface-3)] px-1.5 text-[10px] font-semibold text-[var(--admin-text-muted)] sm:inline-flex">
                ⌘ K
              </span>
            </label>
            <button type="button" className={inboxControlButtonClass}>
              <Funnel size={16} className="shrink-0" />
              <span>Filtrar</span>
              <ChevronDown size={14} className="shrink-0" />
            </button>
            <button type="button" className={inboxControlButtonClass}>
              <ArrowDownUp size={16} className="shrink-0" />
              <span>Mais recentes</span>
              <ChevronDown size={14} className="shrink-0" />
            </button>
          </div>
        </div>
      </section>

      <SectionCard className="grid min-h-0 overflow-hidden rounded-[6px] border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-0 text-[var(--admin-text-primary)] shadow-none lg:grid-cols-[minmax(0,0.54fr)_minmax(300px,0.46fr)]">
        <div className="relative min-h-0 overflow-hidden border-b border-[var(--admin-border)] bg-[var(--admin-surface-1)] lg:border-b-0 lg:border-r">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 z-10 h-7 bg-[linear-gradient(180deg,var(--admin-surface-1),transparent)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-[linear-gradient(0deg,var(--admin-surface-1),transparent)]"
          />
          <div
            aria-label="Lista do Inbox"
            className="admin-scrollbar max-h-[58vh] rounded-[inherit] bg-[var(--admin-surface-1)] divide-y divide-[var(--admin-border)] overflow-y-auto lg:h-full lg:max-h-none"
            role="list"
          >
            {scheduleQuery.isLoading || requirementsQuery.isLoading || supportCasesQuery.isLoading ? <InboxEmptyState loading /> : null}
            {!scheduleQuery.isLoading && !requirementsQuery.isLoading && !supportCasesQuery.isLoading && visibleItems.length > 0 ? visibleItems.map((item) => (
              <InboxRecord
                key={item.id}
                item={item}
                selected={selectedItem?.id === item.id}
                onSelect={() => setSelectedItemId(item.id)}
              />
            )) : null}
            {!scheduleQuery.isLoading && !requirementsQuery.isLoading && !supportCasesQuery.isLoading && visibleItems.length === 0 ? <InboxEmptyState hasSearch={searchTerm.trim().length > 0 || activeFilter !== 'all'} /> : null}
          </div>
        </div>
        <InboxDetailPanel item={selectedItem} />
      </SectionCard>
    </main>
  );
}

export function DashboardPage() {
  return <InboxPage />;
}

function InboxRecord({
  item,
  selected = false,
  onSelect,
}: {
  item: InboxItem;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const meta = inboxTypeMeta[item.type];
  const Icon = meta.icon;
  const dateParts = inboxRecordDateParts(item);

  return (
    <article
      className={cn(
        'relative grid min-h-[76px] grid-cols-[34px_minmax(0,1fr)] gap-2 px-2.5 py-2.5 transition sm:grid-cols-[92px_minmax(0,1fr)_auto] sm:items-center sm:px-3',
        selected ? 'bg-[var(--admin-panel-active)] shadow-[inset_3px_0_var(--admin-border-strong)]' : 'hover:bg-[var(--admin-surface-3)]',
      )}
      role="listitem"
    >
      <button
        type="button"
        onClick={onSelect}
        aria-label={`Ler ${item.title}`}
        aria-pressed={selected}
        className="contents"
      >
        <span className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2 sm:items-center">
          <span className={cn('mt-1 h-2.5 w-2.5 rounded-full sm:mt-0', inboxDotClass(item))} aria-hidden="true" />
          <span className="hidden min-w-0 border-r border-[var(--admin-border)] pr-2 text-center text-[10.5px] font-medium leading-4 text-[var(--admin-text-secondary)] sm:block">
            <span className="block uppercase">{dateParts.primary}</span>
            <span className="block">{dateParts.secondary}</span>
          </span>
          <span
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-[4px] border transition sm:hidden',
              selected
                ? 'border-[var(--admin-border-strong)] bg-[var(--admin-border-strong)] text-white'
                : 'border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)]',
            )}
          >
            <Icon size={13} />
          </span>
        </span>
        <span className="min-w-0 text-left">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-bold leading-5 text-[var(--admin-text-primary)]">{item.title}</span>
            <StatusPill label={item.status} tone={item.tone} />
          </span>
          <span className="mt-1 block text-[12.5px] leading-4 text-[var(--admin-text-secondary)]">{item.summary}</span>
          <span className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[var(--admin-text-muted)]">
            <span>{item.source}</span>
            <span aria-hidden="true">·</span>
            <span>{meta.label}</span>
          </span>
        </span>
        <span className="hidden min-w-[5rem] text-right sm:block">
          <span className={cn('block text-[12px] font-bold leading-4', item.tone === 'neutral' ? 'text-[var(--admin-text-secondary)]' : 'text-[var(--admin-warning-text)]')}>
            {item.when}
          </span>
          <span className="mt-0.5 block text-[10.5px] text-[var(--admin-text-muted)]">{dateParts.short}</span>
        </span>
      </button>
    </article>
  );
}

function inboxDotClass(item: InboxItem) {
  if (item.tone === 'critical') {
    return 'bg-[var(--admin-border-strong)]';
  }

  if (item.tone === 'warning') {
    return 'bg-[var(--admin-warning-text)]';
  }

  return 'bg-[var(--admin-text-muted)]';
}

function inboxRecordDateParts(item: InboxItem) {
  if (!item.dueKey) {
    return { primary: 'Hoje', secondary: '', short: item.when };
  }

  const parsed = new Date(`${item.dueKey}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return { primary: item.when, secondary: '', short: item.when };
  }

  const day = parsed.getDate().toString().padStart(2, '0');
  const month = monthLabels[parsed.getMonth()]?.toUpperCase() ?? '';
  const year = String(parsed.getFullYear());

  return {
    primary: `${day} ${month}`,
    secondary: year,
    short: `${day} ${month}`,
  };
}

function InboxDetailPanel({ item }: { item: InboxItem | null }) {
  if (!item) {
    return (
      <aside className="hidden min-h-0 bg-[var(--admin-surface-2)] p-6 lg:block">
        <InboxEmptyState />
      </aside>
    );
  }

  const meta = inboxTypeMeta[item.type];
  const Icon = meta.icon;

  return (
    <aside className="min-h-0 bg-[var(--admin-surface-2)] p-5 lg:overflow-y-auto lg:p-6" aria-label="Leitura do item selecionado">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--admin-text-muted)]">
            <span>{meta.label}</span>
            <span aria-hidden="true">·</span>
            <span className={item.tone === 'neutral' ? undefined : 'text-[var(--admin-warning-text)]'}>{item.when}</span>
          </div>
          <h3 className="mt-4 text-[clamp(1.75rem,2.8vw,2.5rem)] font-bold leading-[1.02] text-[var(--admin-text-primary)] [text-wrap:balance]">
            {item.title}
          </h3>
          <p className="mt-3 max-w-[36rem] text-[15px] leading-6 text-[var(--admin-text-secondary)]">
            {item.summary}
          </p>
        </div>
        <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] text-[var(--admin-text-secondary)] sm:flex">
          <Icon size={17} />
        </span>
      </div>

      <dl className="mt-7 divide-y divide-[var(--admin-border)] border-y border-[var(--admin-border)]">
        <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 py-3">
          <dt className="text-[12px] text-[var(--admin-text-secondary)]">Tipo</dt>
          <dd className="text-[12px] font-medium text-[var(--admin-text-primary)]">{meta.label}</dd>
        </div>
        <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 py-3">
          <dt className="text-[12px] text-[var(--admin-text-secondary)]">Origem</dt>
          <dd className="text-[12px] font-medium text-[var(--admin-text-primary)]">{item.source}</dd>
        </div>
        <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 py-3">
          <dt className="text-[12px] text-[var(--admin-text-secondary)]">Prazo</dt>
          <dd className="text-[13px] font-bold text-[var(--admin-warning-text)]">{item.when}</dd>
        </div>
      </dl>

      <div className="mt-5 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--admin-text-muted)]">Próximo passo</p>
        <p className="mt-1 text-[12px] leading-5 text-[var(--admin-text-secondary)]">
          {inboxNextStepCopy(item)}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <ListAction
          label={item.action}
          to={item.actionTo}
          className="!h-11 w-full rounded-[3px] border-[var(--admin-border-strong)] bg-[var(--admin-border-strong)] px-5 text-[13px] font-bold !text-white shadow-none hover:bg-[var(--admin-accent-text)] hover:!text-white sm:!h-11 sm:w-[180px]"
        />
      </div>

      <div className="mt-6 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-3 py-2.5 text-[11.5px] leading-5 text-[var(--admin-text-secondary)]">
        A relação com embarques ou compromissos deve vir dos dados de programação. Quando não houver vínculo explícito, trate este item como pendência independente.
      </div>
    </aside>
  );
}

function inboxNextStepCopy(item: InboxItem) {
  if (item.type === 'treinamento') {
    return 'Confira a validade, a evidência exigida e a janela de regularização antes de seguir.';
  }

  if (item.type === 'aso') {
    return 'Confira a necessidade ocupacional e escolha um caminho de regularização conforme disponibilidade.';
  }

  if (item.type === 'mensagem') {
    return 'Leia o retorno do setor e responda somente se ainda houver informação pendente.';
  }

  if (item.type === 'embarque' || item.type === 'desembarque') {
    return 'Confira local, horário e status da programação antes de assumir qualquer alteração.';
  }

  return 'Confira os dados do item e siga para a tela responsável quando precisar agir.';
}

function InboxEmptyState({ hasSearch = false, loading = false }: { hasSearch?: boolean; loading?: boolean }) {
  return (
    <div className="px-3 py-6 text-center sm:px-3.5">
      <p className="text-[13px] font-semibold text-[var(--admin-text-primary)]">
        {loading ? 'Carregando prioridades' : hasSearch ? 'Nenhum item encontrado' : 'Nada novo agora'}
      </p>
      <p className="mt-1 text-[12px] text-[var(--admin-text-secondary)]">
        {loading
          ? 'Consultando eventos e vencimentos do colaborador.'
          : hasSearch
          ? 'Ajuste o filtro ou a busca para ampliar os resultados.'
          : 'Quando houver programação, vencimento, compromisso ou mensagem, o resumo aparece aqui.'}
      </p>
    </div>
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

export function ProgramacaoPage() {
  const [activeFilter, setActiveFilter] = useState<ProgramacaoFilter>('all');
  const session = getAuthSessionSnapshot();
  const { selectedWorker } = useAdminWorkerPreview();
  const canPreview = session?.user.roles.includes('ADMIN') ?? false;
  const previewRange = useMemo(() => programacaoScheduleRange(), []);
  const scheduleQuery = useQuery({
    queryKey: ['boarding-schedule', selectedWorker?.previewReference ?? 'me', previewRange.from, previewRange.to],
    queryFn: () => selectedWorker
      ? listDrakeWorkerPreview(selectedWorker.previewReference, previewRange)
      : listMySchedule(),
    enabled: Boolean(session) && (!canPreview || Boolean(selectedWorker)),
    staleTime: 60_000,
  });

  const sourceItems = !session
    ? scheduleItems
    : toTimelineScheduleItems(scheduleQuery.data?.items ?? []);

  const programacaoFilters = [
    { id: 'all' as const, label: 'Todos' },
    { id: 'embarque' as const, label: 'Embarques' },
    { id: 'desembarque' as const, label: 'Desembarques' },
    { id: 'compromisso' as const, label: 'Compromissos' },
  ];

  const visibleItems = sourceItems.filter((item) =>
    activeFilter === 'all' ? true : item.type === activeFilter,
  ).sort((first, second) => first.isoDate.localeCompare(second.isoDate));
  const timelineGroups = visibleItems.reduce<Array<{
    key: string;
    label: string;
    isCurrentMonth: boolean;
    items: TimelineScheduleItem[];
  }>>((groups, item) => {
    const date = new Date(`${item.isoDate}T00:00:00`);
    const key = item.isoDate.slice(0, 7);
    const label = `${monthLabels[date.getMonth()]} ${date.getFullYear()}`;
    const isCurrentMonth =
      date.getFullYear() === programacaoYear &&
      date.getMonth() === currentProgramacaoMonthIndex;
    const existingGroup = groups.find((group) => group.key === key);

    if (existingGroup) {
      existingGroup.items.push(item);
      return groups;
    }

    return [...groups, { key, label, isCurrentMonth, items: [item] }];
  }, []);

  return (
    <main className="grid w-full gap-2 lg:h-full lg:min-h-0 lg:grid-rows-[auto_minmax(0,1fr)]">
      <section className="rounded-[6px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-2.5 text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)] backdrop-blur-[2px]">
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className={filterGridClass}>
            {programacaoFilters.map((filter) => (
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
                <span className="truncate">{filter.label}</span>
              </button>
            ))}
          </div>
          <div className="flex min-h-8 items-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2.5 text-[11px] font-semibold text-[var(--admin-text-secondary)]">
            {selectedWorker ? `Validação: ${selectedWorker.fullName}` : 'Linha do tempo'}
          </div>
        </div>
      </section>

      <SectionCard className="flex min-h-0 overflow-hidden rounded-[6px] border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-0 text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)] backdrop-blur-[2px]">
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-[inherit] bg-[var(--admin-surface-1)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 z-10 h-7 bg-[linear-gradient(180deg,var(--admin-surface-1),transparent)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-[linear-gradient(0deg,var(--admin-surface-1),transparent)]"
          />
          <div
            aria-label="Linha do tempo da programação"
            className="admin-scrollbar max-h-[62vh] overflow-y-auto px-2 py-2 lg:h-full lg:max-h-none"
            role="list"
          >
            <div className="mx-auto grid w-full max-w-4xl gap-2">
              {scheduleQuery.isLoading ? <ModuleEmptyState title="Carregando programação" body="Consultando somente os eventos necessários." /> : null}
              {scheduleQuery.isError ? <ModuleEmptyState title="Não foi possível carregar a programação" body={scheduleQuery.error.message} /> : null}
              {!scheduleQuery.isLoading && !scheduleQuery.isError && timelineGroups.length > 0 ? timelineGroups.map((group) => (
                <ProgramacaoTimelineGroup key={group.key} group={group} />
              )) : null}
              {!scheduleQuery.isLoading && !scheduleQuery.isError && timelineGroups.length === 0 ? (
                <ModuleEmptyState
                  title={canPreview && !selectedWorker ? 'Selecione um colaborador no topo' : 'Sem eventos neste filtro'}
                  body={canPreview && !selectedWorker ? 'A seleção administrativa global será usada nesta e nas demais páginas da Jornada.' : 'Altere o tipo de evento para ampliar a linha do tempo.'}
                />
              ) : null}
            </div>
          </div>
        </div>
      </SectionCard>
    </main>
  );
}

function ProgramacaoTimelineGroup({
  group,
}: {
  group: {
    label: string;
    isCurrentMonth: boolean;
    items: TimelineScheduleItem[];
  };
}) {
  return (
    <section className="grid gap-2" data-current-month={group.isCurrentMonth ? 'true' : undefined}>
      <div
        className={cn(
          'sticky top-0 z-10 flex min-h-8 items-center justify-between rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-2 py-1 shadow-[var(--admin-shadow)]',
          group.isCurrentMonth ? 'border-[var(--admin-border-strong)] bg-[var(--admin-panel-active)]' : '',
        )}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <h3 className="text-[12px] font-semibold text-[var(--admin-text-primary)]">{group.label}</h3>
          {group.isCurrentMonth ? (
            <span className="rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-secondary)]">
              mes atual
            </span>
          ) : null}
        </div>
        <span className="text-[10px] font-semibold text-[var(--admin-text-muted)]">
          {group.items.length} evento{group.items.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className="relative grid gap-1.5 pl-4 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-[var(--admin-border)]">
        {group.items.map((item) => (
          <ProgramacaoTimelineItem key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function ProgramacaoTimelineItem({ item }: { item: TimelineScheduleItem }) {
  const date = new Date(`${item.isoDate}T00:00:00`);
  const isToday = item.isoDate === currentProgramacaoDateKey;
  const MovementIcon = item.type === 'embarque' ? ArrowUp : item.type === 'desembarque' ? ArrowDown : CalendarClock;

  return (
    <article
      className={cn(
        'relative grid gap-2 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2.5 py-2 sm:grid-cols-[74px_minmax(0,1fr)_auto] sm:items-center',
        isToday ? 'border-[var(--admin-border-strong)] bg-[var(--admin-panel-active)] shadow-[inset_0_0_0_1px_var(--admin-border-strong)]' : '',
      )}
      data-today={isToday ? 'true' : undefined}
      role="listitem"
    >
      <span
        className={cn(
          'absolute -left-[13px] top-3 h-2.5 w-2.5 rounded-full border border-[var(--admin-border)] bg-[var(--admin-text-secondary)]',
          isToday ? 'bg-[var(--brand-600)] ring-2 ring-[rgba(155,31,46,0.22)]' : '',
        )}
      />
      <div className="flex items-center gap-2 sm:block">
        <span className={cn('text-[16px] font-semibold leading-none text-[var(--admin-text-primary)]', isToday ? 'text-white' : '')}>
          {String(date.getDate()).padStart(2, '0')}
        </span>
        <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-muted)] sm:mt-0.5">
          {monthLabels[date.getMonth()]}
        </div>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border', item.type === 'embarque' ? 'border-teal-500/60 text-teal-300' : item.type === 'desembarque' ? 'border-red-400/60 text-red-300' : 'border-sky-400/60 text-sky-300')} aria-label={scheduleTypeLabel(item.type)}>
            <MovementIcon size={15} strokeWidth={2.2} />
          </span>
          <p className="truncate text-[12.5px] font-semibold text-[var(--admin-text-primary)]">{item.title}</p>
          {isToday ? <StatusPill label="hoje" tone="critical" /> : null}
          <StatusPill label={scheduleTypeLabel(item.type)} tone={item.tone} />
        </div>
        <p className="mt-0.5 truncate text-[12px] text-[var(--admin-text-secondary)]">{item.route}</p>
      </div>
      <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-[var(--admin-text-secondary)] sm:block sm:text-right">
        <span>{item.time}</span>
        <p className="text-[10.5px] font-medium text-[var(--admin-text-muted)]">{item.status}</p>
      </div>
    </article>
  );
}

export function ChatPage() {
  const [activeFilter, setActiveFilter] = useState<ChatFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState('');
  const queryClient = useQueryClient();

  useChatSocket(selectedId);

  const summaryConversationsQuery = useQuery({
    queryKey: ['chat', 'conversations', 'summary'],
    queryFn: () => listChatConversations({ filter: 'all', q: '' }),
  });

  const conversationsQuery = useQuery({
    queryKey: ['chat', 'conversations', activeFilter, searchTerm],
    queryFn: () => listChatConversations({ filter: activeFilter, q: searchTerm }),
  });

  const visibleConversations = conversationsQuery.data?.items ?? [];
  const summaryConversations = summaryConversationsQuery.data?.items ?? [];

  const chatFilters = useMemo(
    () => [
      { id: 'all' as const, label: 'Todas', value: summaryConversations.length },
      { id: 'unread' as const, label: 'Novas', value: summaryConversations.filter((item) => item.unreadCount > 0).length },
      { id: 'OPERATIONS' as const, label: 'Operações', value: summaryConversations.filter((item) => item.teamCode === 'OPERATIONS').length },
      { id: 'MEDICINE' as const, label: 'Medicina', value: summaryConversations.filter((item) => item.teamCode === 'MEDICINE').length },
      { id: 'TRAINING' as const, label: 'Treinamento', value: summaryConversations.filter((item) => item.teamCode === 'TRAINING').length },
    ],
    [summaryConversations],
  );

  useEffect(() => {
    if (visibleConversations.length === 0) {
      setSelectedId(null);
      return;
    }

    if (!selectedId || !visibleConversations.some((item) => item.id === selectedId)) {
      setSelectedId(visibleConversations[0].id);
    }
  }, [selectedId, visibleConversations]);

  const selectedConversation =
    visibleConversations.find((item) => item.id === selectedId) ?? visibleConversations[0] ?? null;

  const messagesQuery = useInfiniteQuery({
    queryKey: ['chat', 'messages', selectedConversation?.id],
    queryFn: ({ pageParam }) =>
      listChatMessages({
        conversationId: selectedConversation?.id ?? '',
        cursor: pageParam,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    maxPages: 4,
    enabled: Boolean(selectedConversation?.id),
  });

  const messages = useMemo(
    () => messagesQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [messagesQuery.data],
  );

  const sendMessageMutation = useMutation({
    mutationFn: sendChatMessage,
    onSuccess: (result) => {
      setDraftMessage('');
      void queryClient.invalidateQueries({
        queryKey: ['chat', 'messages', result.message.conversationId],
      });
      void queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
  });

  useEffect(() => {
    if (!selectedConversation?.id || messages.length === 0) {
      return;
    }

    void markChatConversationRead(selectedConversation.id).then(() => {
      void queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    });
  }, [messages.length, queryClient, selectedConversation?.id]);

  const handleSendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const body = draftMessage.trim();
    if (!selectedConversation || !body || sendMessageMutation.isPending) {
      return;
    }

    sendMessageMutation.mutate({
      conversationId: selectedConversation.id,
      body,
      clientMessageId: createClientMessageId(),
    });
  };

  return (
    <main className="grid w-full gap-2">
      <section className="rounded-[6px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-2.5 text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)] backdrop-blur-[2px]">
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(220px,280px)] lg:items-center">
          <div className={filterGridClass}>
            {chatFilters.map((filter) => (
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
                <span className="truncate">{filter.label}</span>
                <span className="text-current/70">{filter.value}</span>
              </button>
            ))}
          </div>
          <label className={searchFieldClass}>
            <Search size={14} className="shrink-0 text-[var(--admin-text-muted)]" />
            <input
              type="search"
              aria-label="Buscar conversas"
              placeholder="Buscar conversas"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.currentTarget.value)}
              className="min-w-0 flex-1 bg-transparent text-[12px] text-[var(--admin-text-primary)] outline-none placeholder:text-[var(--admin-text-muted)]"
            />
          </label>
        </div>
      </section>

      <section className="grid gap-2 lg:grid-cols-[minmax(260px,0.82fr)_minmax(0,1.18fr)]">
        <SectionCard className="overflow-hidden rounded-[6px] border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-0 text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)] backdrop-blur-[2px]">
          <div className="divide-y divide-[var(--admin-border)]">
            {visibleConversations.length > 0 ? visibleConversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => setSelectedId(conversation.id)}
                className={cn(
                  'grid w-full grid-cols-[30px_minmax(0,1fr)_auto] gap-2 px-2.5 py-2 text-left transition hover:bg-[var(--admin-surface-2)] sm:px-3',
                  selectedConversation?.id === conversation.id ? 'bg-[var(--admin-panel-active)]' : 'bg-transparent',
                )}
              >
                <span className="mt-0.5 flex h-7.5 w-7.5 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)]">
                  <MessageSquareText size={14} />
                </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[12.5px] font-semibold text-[var(--admin-text-primary)]">{conversation.title}</span>
                    {conversation.unreadCount > 0 ? <StatusPill label={`${conversation.unreadCount} nova`} tone="warning" /> : null}
                  </span>
                  <span className="mt-0.5 block truncate text-[12px] text-[var(--admin-text-secondary)]">
                    {conversation.lastMessage?.body ?? 'Nenhuma mensagem ainda'}
                  </span>
                  <span className="mt-0.5 block text-[10.5px] text-[var(--admin-text-muted)]">{conversation.sectorLabel}</span>
                </span>
                <span className="text-[10.5px] text-[var(--admin-text-muted)]">{formatChatTime(conversation.lastMessageAt ?? conversation.updatedAt)}</span>
              </button>
            )) : (
              <ModuleEmptyState
                title={conversationsQuery.isLoading ? 'Carregando conversas' : 'Nenhuma conversa encontrada'}
                body={conversationsQuery.isLoading ? 'Buscando setores disponiveis.' : 'Ajuste o filtro ou a busca para ampliar os resultados.'}
              />
            )}
          </div>
        </SectionCard>

        <SectionCard className="flex min-h-[280px] flex-col overflow-hidden rounded-[6px] border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-0 text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)] backdrop-blur-[2px]">
          {selectedConversation ? (
            <>
              <div className="border-b border-[var(--admin-border)] px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-semibold">{selectedConversation.title}</p>
                    <p className="mt-0.5 truncate text-[11px] text-[var(--admin-text-muted)]">{selectedConversation.sectorLabel}</p>
                  </div>
                  <StatusPill label={selectedConversation.unreadCount > 0 ? 'nova' : 'ok'} tone={selectedConversation.unreadCount > 0 ? 'warning' : 'neutral'} />
                </div>
              </div>
              <div className="admin-scrollbar flex-1 overflow-hidden px-3 py-3">
                {messagesQuery.hasNextPage ? (
                  <button
                    type="button"
                    onClick={() => void messagesQuery.fetchNextPage()}
                    disabled={messagesQuery.isFetchingNextPage}
                    className="mb-2 h-7 w-full rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[10.5px] font-semibold text-[var(--admin-text-secondary)] transition hover:bg-[var(--admin-panel-active)] disabled:opacity-60"
                  >
                    {messagesQuery.isFetchingNextPage ? 'Carregando...' : 'Carregar anteriores'}
                  </button>
                ) : null}
                {messages.length > 0 ? (
                  <Virtuoso
                    className="admin-scrollbar"
                    style={{ height: '100%' }}
                    data={messages}
                    followOutput="smooth"
                    itemContent={(_, message) => <ChatMessageBubble message={message} />}
                  />
                ) : (
                  <ModuleEmptyState
                    title={messagesQuery.isLoading ? 'Carregando mensagens' : 'Conversa vazia'}
                    body={messagesQuery.isLoading ? 'Buscando historico recente.' : 'Envie a primeira mensagem para este setor.'}
                  />
                )}
              </div>
              <form onSubmit={handleSendMessage} className="border-t border-[var(--admin-border)] p-2.5">
                <label className="flex min-h-9 min-w-0 items-center gap-2 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2.5 py-1 text-[12px] text-[var(--admin-text-secondary)]">
                  <input
                    type="text"
                    aria-label="Responder conversa"
                    placeholder="Responder..."
                    value={draftMessage}
                    onChange={(event) => setDraftMessage(event.currentTarget.value)}
                    className="min-w-0 flex-1 bg-transparent text-[12px] text-[var(--admin-text-primary)] outline-none placeholder:text-[var(--admin-text-muted)]"
                  />
                  <button
                    type="submit"
                    aria-label="Enviar mensagem"
                    disabled={!draftMessage.trim() || sendMessageMutation.isPending}
                    className="flex h-7 w-7 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-panel-active)] text-[var(--admin-text-primary)]"
                  >
                    <Send size={13} />
                  </button>
                </label>
                {sendMessageMutation.isError ? (
                  <p className="mt-1 text-[11px] text-[var(--admin-danger-text)]">
                    {sendMessageMutation.error.message}
                  </p>
                ) : null}
              </form>
            </>
          ) : (
            <ModuleEmptyState title="Nenhuma conversa selecionada" body="Escolha uma conversa para ver as mensagens." />
          )}
        </SectionCard>
      </section>
    </main>
  );
}

function ChatMessageBubble({ message }: { message: ChatMessage }) {
  return (
    <div className="pb-2">
      <div
        className={cn(
          'max-w-[82%] rounded-[5px] border px-2.5 py-2',
          message.mine
            ? 'ml-auto border-[var(--admin-border-strong)] bg-[var(--admin-panel-active)]'
            : 'border-[var(--admin-border)] bg-[var(--admin-surface-2)]',
        )}
      >
        <p className="text-[10.5px] font-semibold text-[var(--admin-text-muted)]">{message.senderName}</p>
        <p className="mt-1 text-[12px] leading-4 text-[var(--admin-text-primary)]">{message.body}</p>
        <p className="mt-1 text-right text-[10px] text-[var(--admin-text-muted)]">{formatChatTime(message.createdAt)}</p>
      </div>
    </div>
  );
}

function formatChatTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function createClientMessageId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function ProfilePage() {
  const queryClient = useQueryClient();
  const session = getAuthSessionSnapshot();
  const profileQuery = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: getMyProfile,
    enabled: Boolean(session?.accessToken),
  });
  const profile = profileQuery.data?.item;
  const official = toProfileOfficialView(profile);
  const [activeTab, setActiveTab] = useState<ProfileTab>('identity');
  const [form, setForm] = useState<ProfilePreferenceForm>(() => toProfilePreferenceForm(profile));
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const notificationChannelLabel =
    profileNotificationChannelOptions.find((item) => item.id === form.notificationChannel)?.label ?? 'Email';

  useEffect(() => {
    setForm(toProfilePreferenceForm(profile));
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: (response) => {
      queryClient.setQueryData(['profile', 'me'], response);
      setStatusMessage('Ajustes salvos.');
    },
    onError: (error: Error) => {
      setStatusMessage(error.message);
    },
  });

  const handlePreferenceChange = (field: keyof ProfilePreferenceForm, value: string) => {
    setStatusMessage(null);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateProfileMutation.mutate(toUpdateMyProfilePayload(form));
  };

  const handleReset = () => {
    setForm(toProfilePreferenceForm(profile));
    setStatusMessage(null);
  };

  const canSave = Boolean(session?.accessToken) && !updateProfileMutation.isPending;

  return (
    <main className="grid w-full gap-2">
      <SectionCard className="rounded-[6px] border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-3 text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)] backdrop-blur-[2px]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)]">
              <UserRound size={17} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold">{official.displayName}</p>
              <p className="mt-0.5 truncate text-[12px] text-[var(--admin-text-secondary)]">
                {official.departmentName} • {official.email}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <StatusPill label={official.accountStatusLabel} tone="neutral" />
            <StatusPill label={notificationChannelLabel} tone="neutral" />
          </div>
        </div>
      </SectionCard>

      <div
        role="tablist"
        aria-label="Seções do perfil"
        className="grid grid-cols-2 gap-1.5 rounded-[6px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-1 shadow-[var(--admin-shadow)] sm:grid-cols-4"
      >
        {profileTabs.map(({ id, label, icon: Icon }) => {
          const isSelected = activeTab === id;

          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls={`profile-panel-${id}`}
              id={`profile-tab-${id}`}
              onClick={() => setActiveTab(id)}
              className={cn(
                'inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-[4px] border px-2 text-[11px] font-semibold transition outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]',
                isSelected
                  ? 'border-[var(--admin-border-strong)] bg-[var(--admin-panel-active)] text-[var(--admin-text-primary)]'
                  : 'border-transparent bg-transparent text-[var(--admin-text-secondary)] hover:border-[var(--admin-border)] hover:bg-[var(--admin-surface-2)] hover:text-[var(--admin-text-primary)]',
              )}
            >
              <Icon size={13} className="shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'identity' ? (
        <section
          role="tabpanel"
          id="profile-panel-identity"
          aria-labelledby="profile-tab-identity"
          className="grid gap-2 lg:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)]"
        >
          <SectionCard className="rounded-[6px] border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-3 text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)] backdrop-blur-[2px]">
            <CompactSectionTitle icon={<IdCard size={15} />} title="Identidade oficial" />
            <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
              {official.identity.map((item) => (
                <ProfileField key={item.label} label={item.label} value={item.value} />
              ))}
            </div>
          </SectionCard>

          <SectionCard className="rounded-[6px] border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-3 text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)] backdrop-blur-[2px]">
            <CompactSectionTitle icon={<BriefcaseBusiness size={15} />} title="Vinculo operacional" />
            <div className="mt-3 grid gap-1.5">
              <ProfileField label="Cargo" value={official.roleName} />
              <ProfileField label="Setor" value={official.departmentName} />
              <ProfileField label="Base principal" value={form.primaryBase || 'Nao informada'} />
            </div>
          </SectionCard>
        </section>
      ) : null}

      {activeTab === 'contact' ? (
        <section
          role="tabpanel"
          id="profile-panel-contact"
          aria-labelledby="profile-tab-contact"
          className="grid gap-2"
        >
          <SectionCard className="rounded-[6px] border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-3 text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)] backdrop-blur-[2px]">
            <form onSubmit={handleSubmit} className="grid gap-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <CompactSectionTitle icon={<ShieldCheck size={15} />} title="Contato e ajustes pessoais" />
                <div className="flex gap-1.5">
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-8 px-2.5 text-[12px]"
                    onPress={handleReset}
                    isDisabled={updateProfileMutation.isPending}
                  >
                    <RotateCcw size={13} />
                    Restaurar
                  </Button>
                  <Button
                    type="submit"
                    className="min-h-8 px-2.5 text-[12px]"
                    isDisabled={!canSave}
                  >
                    <Save size={13} />
                    {updateProfileMutation.isPending ? 'Salvando' : 'Salvar'}
                  </Button>
                </div>
              </div>

              <div className="grid gap-2 lg:grid-cols-[minmax(220px,0.75fr)_minmax(0,1.25fr)]">
                <div className="grid content-start gap-1.5">
                  <ProfileInline icon={<Mail size={14} />} label="Email" value={official.email} />
                  <ProfileInline icon={<Phone size={14} />} label="Telefone" value={form.phoneNumber || 'Nao informado'} />
                  <ProfileInline icon={<MapPin size={14} />} label="Base" value={form.primaryBase || 'Nao informada'} />
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <ProfileEditableField
                    label="Nome de preferencia"
                    value={form.preferredName}
                    placeholder={official.displayName}
                    onChange={(value) => handlePreferenceChange('preferredName', value)}
                  />
                  <ProfileEditableField
                    label="Telefone"
                    value={form.phoneNumber}
                    placeholder="+55 00 00000-0000"
                    onChange={(value) => handlePreferenceChange('phoneNumber', value)}
                  />
                  <ProfileEditableField
                    label="Contato de emergencia"
                    value={form.emergencyContactName}
                    placeholder="Nome do contato"
                    onChange={(value) => handlePreferenceChange('emergencyContactName', value)}
                  />
                  <ProfileEditableField
                    label="Telefone de emergencia"
                    value={form.emergencyContactPhone}
                    placeholder="+55 00 00000-0000"
                    onChange={(value) => handlePreferenceChange('emergencyContactPhone', value)}
                  />
                  <ProfileEditableField
                    label="Base principal"
                    value={form.primaryBase}
                    placeholder="Macae, RJ"
                    onChange={(value) => handlePreferenceChange('primaryBase', value)}
                  />
                  <div className="rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-2.5">
                    <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-text-muted)]">
                      <Bell size={12} />
                      Canal preferido
                    </div>
                    <SelectField
                      aria-label="Canal preferido"
                      items={profileNotificationChannelOptions}
                      selectedKey={form.notificationChannel}
                      onSelectionChange={(key: Key | null) => {
                        if (!key) {
                          return;
                        }

                        handlePreferenceChange('notificationChannel', String(key));
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2.5 py-2 text-[11px] leading-4 text-[var(--admin-text-secondary)]">
                Dados oficiais ficam bloqueados para proteger a origem corporativa. Estes ajustes servem para contato e preferencia de comunicacao dentro da Jornada.
              </div>

              {profileQuery.isLoading ? (
                <p className="text-[11px] text-[var(--admin-text-muted)]">Carregando preferencias salvas.</p>
              ) : null}
              {profileQuery.isError ? (
                <p className="text-[11px] text-[var(--danger-600)]">{profileQuery.error.message}</p>
              ) : null}
              {statusMessage ? (
                <p className="text-[11px] text-[var(--admin-text-secondary)]">{statusMessage}</p>
              ) : null}
            </form>
          </SectionCard>
        </section>
      ) : null}

      {activeTab === 'access' ? (
        <section
          role="tabpanel"
          id="profile-panel-access"
          aria-labelledby="profile-tab-access"
        >
          <SectionCard className="rounded-[6px] border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-3 text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)] backdrop-blur-[2px]">
            <CompactSectionTitle icon={<KeyRound size={15} />} title="Acesso" />
            <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
              {official.access.map((item) => (
                <ProfileStatus key={item.label} label={item.label} value={item.value} tone={item.tone} />
              ))}
            </div>
          </SectionCard>
        </section>
      ) : null}

      {activeTab === 'documents' ? (
        <section
          role="tabpanel"
          id="profile-panel-documents"
          aria-labelledby="profile-tab-documents"
        >
          <SectionCard className="rounded-[6px] border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-3 text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)] backdrop-blur-[2px]">
            <CompactSectionTitle icon={<FileText size={15} />} title="Documentos e requisitos" />
            <div className="mt-2 grid gap-1.5 md:grid-cols-3">
              {profileDocuments.map((item) => (
                <ProfileStatus key={item.label} label={item.label} value={item.value} tone={item.tone} />
              ))}
            </div>
          </SectionCard>
        </section>
      ) : null}
    </main>
  );
}

type ProfilePreferenceForm = {
  preferredName: string;
  phoneNumber: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  primaryBase: string;
  notificationChannel: ProfileNotificationChannel;
};

function toProfileOfficialView(profile: MyProfile | undefined) {
  const fallbackName = getAuthSessionSnapshot()?.user.fullName ?? employeeProfile.displayName;
  const fallbackEmail = getAuthSessionSnapshot()?.user.email ?? userAccessContext.email;
  const fullName = profile?.official.fullName ?? fallbackName;
  const displayName = profile?.preferences.preferredName || fullName;
  const departmentName = profile?.official.departmentName ?? employeeProfile.departmentName;
  const documentMasked = profile?.official.documentMasked ?? employeeProfile.documentMasked;
  const employeeNumber = profile?.official.employeeNumber ?? employeeProfile.registration;
  const accountStatus = profile?.official.accountStatus ?? employeeProfile.status;
  const roles = profile?.official.roles ?? userAccessContext.roles;

  return {
    displayName,
    email: profile?.official.email ?? fallbackEmail,
    departmentName: departmentName ?? 'Nao informado',
    roleName: employeeProfile.roleName,
    accountStatusLabel: accountStatus === 'ACTIVE' ? 'ativo' : 'pendente',
    identity: [
      { label: 'Nome oficial', value: fullName },
      { label: 'CPF', value: documentMasked ?? 'Nao informado' },
      { label: 'Nascimento', value: formatProfileDate(profile?.official.birthDate) },
      { label: 'Matricula', value: employeeNumber ?? 'Nao informada' },
    ],
    access: [
      { label: 'Conta', value: accountStatus === 'ACTIVE' ? 'Ativa' : 'Pendente', tone: 'neutral' as const },
      { label: 'Perfil', value: roles.includes('EMPLOYEE') ? 'Colaborador' : 'Operacional', tone: 'neutral' as const },
      { label: 'Ultimo acesso', value: formatProfileDateTime(profile?.official.lastLoginAt), tone: 'neutral' as const },
    ],
  };
}

function toProfilePreferenceForm(profile: MyProfile | undefined): ProfilePreferenceForm {
  return {
    preferredName: profile?.preferences.preferredName ?? '',
    phoneNumber: profile?.preferences.phoneNumber ?? '',
    emergencyContactName: profile?.preferences.emergencyContactName ?? '',
    emergencyContactPhone: profile?.preferences.emergencyContactPhone ?? '',
    primaryBase: profile?.preferences.primaryBase ?? 'Macae',
    notificationChannel: profile?.preferences.notificationChannel ?? 'EMAIL',
  };
}

function toUpdateMyProfilePayload(form: ProfilePreferenceForm): UpdateMyProfilePayload {
  return {
    preferredName: textOrNull(form.preferredName),
    phoneNumber: textOrNull(form.phoneNumber),
    emergencyContactName: textOrNull(form.emergencyContactName),
    emergencyContactPhone: textOrNull(form.emergencyContactPhone),
    primaryBase: textOrNull(form.primaryBase),
    notificationChannel: form.notificationChannel,
  };
}

function textOrNull(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatProfileDate(value?: string | null) {
  if (!value) {
    return 'Nao informado';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));
}

function formatProfileDateTime(value?: string | null) {
  if (!value) {
    return 'Ainda nao registrado';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function ProfileEditableField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-2.5">
      <TextField
        label={label}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        className="flex flex-col gap-1.5"
        inputClassName="h-9 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-3 text-[12px] text-[var(--admin-text-primary)] outline-none transition placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-border-strong)] focus:bg-[var(--admin-panel-active)]"
      />
    </div>
  );
}

function CompactSectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-[12.5px] font-semibold text-[var(--admin-text-primary)]">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)]">
        {icon}
      </span>
      <span>{title}</span>
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-text-muted)]">{label}</p>
      <p className="mt-0.5 truncate text-[12px] font-semibold text-[var(--admin-text-primary)]">{value}</p>
    </div>
  );
}

function ProfileInline({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2.5 py-2">
      <span className="text-[var(--admin-text-muted)]">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-text-muted)]">{label}</p>
        <p className="mt-0.5 truncate text-[12px] font-semibold text-[var(--admin-text-primary)]">{value}</p>
      </div>
    </div>
  );
}

function ProfileStatus({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: InboxTone;
}) {
  return (
    <div className="rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[12px] font-semibold text-[var(--admin-text-primary)]">{label}</p>
        <StatusPill label={tone === 'neutral' ? 'ok' : tone === 'warning' ? 'atenção' : 'crítico'} tone={tone} />
      </div>
      <p className="mt-1 truncate text-[12px] text-[var(--admin-text-secondary)]">{value}</p>
    </div>
  );
}
