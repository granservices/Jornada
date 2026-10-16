import {
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  CalendarRange,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ClipboardCheck,
  ClipboardList,
  Inbox,
  Megaphone,
  LockKeyhole,
  LogOut,
  MessageSquare,
  MoreHorizontal,
  PanelsTopLeft,
  Send,
  TicketCheck,
  Settings2,
  UserRound,
  UsersRound,
  X,
  Search,
  RefreshCw,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button as AriaButton,
  ListBox,
  ListBoxItem,
  Popover,
  Select,
  SelectValue,
} from 'react-aria-components/Select';
import { Button } from '../components/ui/button';
import { clearAuthSession } from '../features/auth/auth-session';
import {
  applicationEntryHref,
  isExternalHref,
} from '../features/auth/application-entry';
import {
  hasApplicationAccess,
  isSupportOperatorUser,
} from '../features/auth/auth-routing';
import { useAuthSession } from '../features/auth/use-auth-session';
import {
  addSupportCaseMessage,
  getSupportCase,
  type SupportCaseDetail,
} from '../modules/tickets/support-api';
import { ThemeToggleButton } from '../features/theme/theme-toggle-button';
import { useAdminWorkerPreview } from '../features/admin-worker-preview/admin-worker-preview-context';
import { findDrakeWorkers, type DrakeWorkerPreview } from '../features/schedule/schedule-api';
import { cn } from '../lib/cn';
import { BrandMark } from './brand-mark';

type ModuleApplicationCode = 'JORNADA' | 'TICKETS' | 'QUICK_FORMS';
type ShellExperience = 'worker' | 'atendimento' | 'quick-forms' | 'administracao';
type NavigationGroup = 'routine' | 'relationship' | 'account' | 'operation' | 'configuration' | 'administration';

const navigation: Array<{
  label: string;
  description: string;
  icon: typeof Inbox;
  to: string;
  group: NavigationGroup;
  mobilePriority?: 'primary' | 'secondary';
  applicationCode?: ModuleApplicationCode;
  experience?: 'administracao';
  roles?: string[];
}> = [
  {
    label: 'Inbox',
    description: 'O que pede atencao',
    icon: Inbox,
    to: '/inbox',
    group: 'routine',
    applicationCode: 'JORNADA',
  },
  {
    label: 'Programação',
    description: 'Embarques',
    icon: CalendarRange,
    to: '/programacao',
    group: 'routine',
    applicationCode: 'JORNADA',
  },
  {
    label: 'Vencimentos',
    description: 'ASO e cursos',
    icon: ClipboardCheck,
    to: '/vencimentos',
    group: 'routine',
    applicationCode: 'JORNADA',
  },
  {
    label: 'Comunicados',
    description: 'Informacoes operacionais',
    icon: Megaphone,
    to: '/comunicados',
    group: 'relationship',
    mobilePriority: 'secondary',
    applicationCode: 'JORNADA',
  },
  {
    label: 'Atendimento',
    description: 'Fale com um setor',
    icon: MessageSquare,
    to: '/atendimento',
    group: 'relationship',
    applicationCode: 'JORNADA',
  },
  {
    label: 'Atendimentos',
    description: 'Resolver demandas',
    icon: TicketCheck,
    to: '/atendimentos',
    group: 'operation',
    applicationCode: 'TICKETS',
    roles: ['ADMIN', 'SUPPORT', 'TI', 'MEDICINE', 'OPERATIONS'],
  },
  {
    label: 'Aprovações',
    description: 'Decidir solicitações',
    icon: ClipboardList,
    to: '/atendimentos/aprovacoes',
    group: 'operation',
    applicationCode: 'TICKETS',
    roles: ['ADMIN', 'SUPPORT', 'TI', 'MEDICINE', 'OPERATIONS'],
  },
  {
    label: 'Config. atendimento',
    description: 'Catalogo e regras',
    icon: Settings2,
    to: '/atendimentos/configuracao',
    group: 'configuration',
    mobilePriority: 'secondary',
    applicationCode: 'TICKETS',
    roles: ['ADMIN', 'SUPPORT'],
  },
  {
    label: 'QuickForms',
    description: 'Biblioteca e versoes',
    icon: ClipboardList,
    to: '/formularios',
    group: 'operation',
    applicationCode: 'QUICK_FORMS',
    roles: ['ADMIN', 'TI'],
  },
  {
    label: 'Fontes',
    description: 'Opcoes reutilizaveis',
    icon: Search,
    to: '/formularios/fontes',
    group: 'configuration',
    mobilePriority: 'secondary',
    applicationCode: 'QUICK_FORMS',
    roles: ['ADMIN', 'TI'],
  },
  {
    label: 'Perfil',
    description: 'Dados e acesso',
    icon: UserRound,
    to: '/perfil',
    group: 'account',
    mobilePriority: 'secondary',
    applicationCode: 'JORNADA',
  },
  {
    label: 'Visão geral',
    description: 'Administracao Neo',
    icon: Settings2,
    to: '/administracao',
    group: 'administration',
    experience: 'administracao',
    roles: ['ADMIN'],
  },
  {
    label: 'Aplicativos',
    description: 'Catalogo central',
    icon: PanelsTopLeft,
    to: '/administracao/aplicativos',
    group: 'administration',
    experience: 'administracao',
    roles: ['ADMIN'],
  },
  {
    label: 'Usuarios e acessos',
    description: 'Pessoas e permissoes',
    icon: UsersRound,
    to: '/administracao/usuarios',
    group: 'administration',
    experience: 'administracao',
    roles: ['ADMIN'],
  },
];

const navigationGroupLabels: Record<NavigationGroup, string> = {
  routine: 'Rotina',
  relationship: 'Relacionamento',
  account: 'Conta',
  operation: 'Operação',
  configuration: 'Configuração',
  administration: 'Administração',
};

const tabLabels: Record<string, string> = {
  inbox: 'Inbox',
  programacao: 'Programação',
  vencimentos: 'Vencimentos e alertas',
  comunicados: 'Comunicados',
  atendimento: 'Atendimento',
  atendimentos: 'Atendimentos',
  'atendimentos/aprovacoes': 'Aprovações',
  'atendimentos/configuracao': 'Config. atendimento',
  'atendimentos/configuracao/setores': 'Setores',
  'atendimentos/configuracao/assuntos': 'Assuntos',
  'atendimentos/configuracao/equipes': 'Equipes',
  'atendimentos/configuracao/regras': 'Regras',
  'atendimentos/configuracao/aprovacoes': 'Regras de aprovação',
  'atendimentos/configuracao/formularios': 'Formularios',
  formularios: 'Formularios',
  'formularios/fontes': 'Fontes de opcoes',
  perfil: 'Perfil',
  administracao: 'Visão geral',
  'administracao/aplicativos': 'Aplicativos',
  'administracao/usuarios': 'Usuarios e acessos',
};

const staticPlanets = [
  {
    left: '8%',
    top: '9%',
    size: 112,
    colors: ['#eceff1', '#a3a9b1', '#292d33'],
    ring: true,
    ringTone: 'rgba(163, 169, 177, 0.34)',
    opacity: 0.52,
    depth: 0.12,
    driftX: -7,
    driftY: -10,
    duration: 28,
    delay: -6,
  },
  {
    left: '76%',
    top: '8%',
    size: 72,
    colors: ['#dbc1c7', '#9b1f2e', '#17191c'],
    ring: false,
    opacity: 0.34,
    depth: 0.08,
    driftX: 5,
    driftY: -7,
    duration: 24,
    delay: -10,
  },
  {
    left: '58%',
    top: '26%',
    size: 42,
    colors: ['#eceff1', '#69717b', '#17191c'],
    ring: false,
    opacity: 0.24,
    depth: 0.05,
    driftX: 4,
    driftY: -5,
    duration: 20,
    delay: -2,
  },
  {
    left: '18%',
    top: '56%',
    size: 54,
    colors: ['#f8fafc', '#94a3b8', '#334155'],
    ring: false,
    opacity: 0.2,
    depth: 0.07,
    driftX: -5,
    driftY: 6,
    duration: 22,
    delay: -12,
  },
  {
    left: '70%',
    top: '64%',
    size: 138,
    colors: ['#e2e8f0', '#64748b', '#0f172a'],
    ring: true,
    ringTone: 'rgba(148, 163, 184, 0.36)',
    opacity: 0.28,
    depth: 0.16,
    driftX: 8,
    driftY: -11,
    duration: 32,
    delay: -8,
  },
  {
    left: '88%',
    top: '82%',
    size: 88,
    colors: ['#d7b36a', '#9b1f2e', '#2a171b'],
    ring: true,
    ringTone: 'rgba(215, 179, 106, 0.24)',
    opacity: 0.18,
    depth: 0.1,
    driftX: -4,
    driftY: 7,
    duration: 26,
    delay: -14,
  },
];

const staticSatellites = [
  {
    left: '28%',
    top: '18%',
    scale: 0.84,
    rotate: -18,
    opacity: 0.34,
    depth: 0.1,
    driftX: 5,
    driftY: -4,
    duration: 18,
    delay: -4,
  },
  {
    left: '84%',
    top: '38%',
    scale: 0.96,
    rotate: 16,
    opacity: 0.28,
    depth: 0.13,
    driftX: -6,
    driftY: 5,
    duration: 21,
    delay: -9,
  },
  {
    left: '24%',
    top: '78%',
    scale: 0.74,
    rotate: 28,
    opacity: 0.22,
    depth: 0.06,
    driftX: 4,
    driftY: -3,
    duration: 17,
    delay: -7,
  },
];

type SidebarLockMode = 'auto' | 'open' | 'closed';

const sidebarMotion = {
  expanded: 248,
  collapsed: 72,
};
const sidebarLockStorageKey = 'jornada.sidebar.lockMode';
const supportWorkspaceMinimizedStorageKey = 'jornada.support.workspace.minimized';
const supportWorkspaceDraftStorageKeyPrefix = 'jornada.support.workspace.draft.';

export function AppShellLayout({ experience = 'worker' }: { experience?: ShellExperience }) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useAuthSession();
  const prefersReducedMotion = useReducedMotion();
  const [sidebarLockMode, setSidebarLockMode] = useState<SidebarLockMode>(() =>
    sidebarLockModeFromStorage(),
  );
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const user = session?.user;
  const currentSection = sectionKeyFromPath(location.pathname);
  const activeModuleCode = experienceApplicationCode(experience);
  const availableModules = session?.applications?.filter(
    (application) => Boolean(application.code && application.entryPath),
  ) ?? [];
  const activeModule = availableModules.find(
    (application) => application.code === activeModuleCode,
  );
  const activeProfile = profileLabel(user?.roles);
  const userDisplayName = user?.fullName ?? 'Usuario autenticado';
  const userFirstName = firstNameLabel(userDisplayName);
  const visibleNavigation = navigation
    .filter((item) =>
      experience === 'administracao'
        ? item.experience === 'administracao'
        : item.applicationCode === experienceApplicationCode(experience),
    )
    .filter((item) =>
      canAccessNavigationItem({
        applications: session?.applications,
        itemApplicationCode: item.applicationCode,
        itemRoles: item.roles,
        userRoles: user?.roles,
      }),
    );
  const groupedNavigation = groupNavigationItems(visibleNavigation);
  const primaryMobileNavigation = visibleNavigation.filter(
    (item) => item.mobilePriority !== 'secondary',
  );
  const secondaryMobileNavigation = visibleNavigation.filter(
    (item) => item.mobilePriority === 'secondary',
  );
  const isSupportOperator = isSupportOperatorUser(user);
  const sidebarExpanded =
    sidebarLockMode === 'open' ||
    (sidebarLockMode === 'auto' && sidebarHovered);
  const sidebarReservedWidth = sidebarExpanded
    ? sidebarMotion.expanded
    : sidebarMotion.collapsed;
  const sidebarLocked = sidebarLockMode !== 'auto';

  const handleLogout = () => {
    clearAuthSession();
    startTransition(() => {
      void navigate('/login', { replace: true });
    });
  };
  const handleModuleChange = (applicationCode: string) => {
    const nextModule = availableModules.find(
      (application) => application.code === applicationCode,
    );

    if (!nextModule) {
      return;
    }

    const destination = applicationEntryHref(nextModule);

    if (isExternalHref(destination)) {
      window.location.assign(destination);
      return;
    }

    void navigate(destination);
  };
  useEffect(() => {
    localStorage.setItem(sidebarLockStorageKey, sidebarLockMode);
  }, [sidebarLockMode]);
  const toggleSidebarLock = () => {
    setSidebarLockMode((current) => {
      if (current === 'auto') {
        return sidebarExpanded ? 'open' : 'closed';
      }

      if (current === 'open') {
        return 'closed';
      }

      return 'auto';
    });
  };
  const sidebarTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const };
  const workspaceSearch = useMemo(
    () => supportWorkspaceSearchFromLocation(location.search, isSupportOperator),
    [isSupportOperator, location.search],
  );
  const supportDockCaseId = useMemo(() => {
    if (!workspaceSearch) {
      return null;
    }

    return new URLSearchParams(workspaceSearch).get('caso');
  }, [workspaceSearch]);
  const showGlobalSupportDock =
    Boolean(supportDockCaseId) &&
    isSupportOperator &&
    !location.pathname.startsWith('/atendimentos');
  const [dockMinimized, setDockMinimized] = useState(() => supportWorkspaceMinimizedFromStorage());
  const [dockMessageDraft, setDockMessageDraft] = useState('');
  useEffect(() => {
    localStorage.setItem(
      supportWorkspaceMinimizedStorageKey,
      dockMinimized ? '1' : '0',
    );
  }, [dockMinimized]);
  useEffect(() => {
    if (!supportDockCaseId) {
      setDockMessageDraft('');
      return;
    }

    setDockMessageDraft(
      sessionStorage.getItem(supportWorkspaceDraftStorageKey(supportDockCaseId)) ?? '',
    );
  }, [supportDockCaseId]);
  useEffect(() => {
    if (!supportDockCaseId) {
      return;
    }

    const storageKey = supportWorkspaceDraftStorageKey(supportDockCaseId);

    if (dockMessageDraft.trim()) {
      sessionStorage.setItem(storageKey, dockMessageDraft);
      return;
    }

    sessionStorage.removeItem(storageKey);
  }, [dockMessageDraft, supportDockCaseId]);
  const dockDetailQuery = useQuery({
    queryKey: ['support', 'workspace-dock', supportDockCaseId],
    queryFn: () => getSupportCase(supportDockCaseId as string),
    enabled: Boolean(showGlobalSupportDock && supportDockCaseId),
  });
  const dockMessageMutation = useMutation({
    mutationFn: addSupportCaseMessage,
    onSuccess: () => {
      if (supportDockCaseId) {
        sessionStorage.removeItem(supportWorkspaceDraftStorageKey(supportDockCaseId));
      }
      setDockMessageDraft('');
      void queryClient.invalidateQueries({
        queryKey: ['support', 'workspace-dock', supportDockCaseId],
      });
      void queryClient.invalidateQueries({ queryKey: ['support', 'cases'] });
      void queryClient.invalidateQueries({
        queryKey: ['support', 'cases', supportDockCaseId, 'detail'],
      });
      void queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
  });

  const closeSupportDock = () => {
    const nextParams = new URLSearchParams(location.search);
    nextParams.delete('dock');
    nextParams.delete('caso');
    nextParams.delete('aba');
    nextParams.delete('modo');
    const nextSearch = nextParams.toString();
    void navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : '',
      },
      { replace: true },
    );
  };

  const openSupportDockCase = () => {
    if (!supportDockCaseId) {
      return;
    }

    void navigate(`/atendimentos?modo=detail&caso=${supportDockCaseId}&aba=conversa&dock=1`);
  };

  const sendDockMessage = () => {
    if (!supportDockCaseId || !dockMessageDraft.trim()) {
      return;
    }

    dockMessageMutation.mutate({
      supportCaseId: supportDockCaseId,
      body: dockMessageDraft,
    });
  };
  const toggleSupportDockMinimized = () => {
    setDockMinimized((current) => !current);
  };

  return (
    <div className="jornada-admin-shell neo-app-frame relative isolate min-h-screen overflow-x-clip bg-[var(--admin-canvas)] text-[var(--admin-text-primary)]">
      <AdminSpaceBackdrop />
      <div className="relative z-10 min-h-screen lg:h-screen lg:overflow-hidden">
        <div className="mx-auto flex min-h-screen w-full max-w-[1920px] flex-col lg:h-full lg:min-h-0 lg:flex-row">
          <motion.div
            initial={false}
            animate={{ width: sidebarReservedWidth }}
            transition={sidebarTransition}
            className="relative hidden shrink-0 self-start overflow-visible lg:block lg:h-full"
            data-testid="desktop-sidebar-rail"
            data-sidebar-rail={sidebarExpanded ? 'expanded' : 'collapsed'}
          >
            <motion.aside
              initial={false}
              animate={{ width: sidebarExpanded ? sidebarMotion.expanded : sidebarMotion.collapsed }}
              transition={sidebarTransition}
              onMouseEnter={() => setSidebarHovered(true)}
              onMouseLeave={() => setSidebarHovered(false)}
              className="absolute left-0 top-0 z-40 flex h-full overflow-hidden rounded-none border-y-0 border-l-0 border-r border-[var(--admin-border)] bg-[var(--admin-shell)] px-2.5 py-3 shadow-none lg:flex-col"
              aria-label="Navegacao principal"
              data-sidebar-state={sidebarExpanded ? 'expanded' : 'collapsed'}
              data-sidebar-lock={sidebarLockMode}
            >
              <div className={cn('flex items-center', sidebarExpanded ? 'justify-start' : 'justify-center')}>
                <div className={cn('min-w-0', sidebarExpanded ? '' : 'w-10')}>
                  {sidebarExpanded ? (
                    <BrandMark title="Neo" subtitle={experienceProductName(experience)} />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)]">
                      <img
                        src="/crew-logo.png"
                        alt="Neo"
                        className="h-6 w-6 object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>

              <nav className="admin-scrollbar mt-4 flex flex-1 flex-col gap-1 overflow-y-auto pr-1">
                {groupedNavigation.map((group, groupIndex) => (
                  <div
                    key={group.key}
                    className={cn(groupIndex > 0 ? (sidebarExpanded ? 'mt-3' : 'mt-2') : '')}
                  >
                    {sidebarExpanded ? (
                      <p className="px-2 pb-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--admin-text-muted)]">
                        {navigationGroupLabels[group.key]}
                      </p>
                    ) : null}
                    <div className="flex flex-col gap-1">
                      {group.items.map(({ label, description, icon: Icon, to }) => (
                        <NavItem
                          key={to}
                          label={label}
                          description={description}
                          icon={<Icon size={18} strokeWidth={2} />}
                          to={appendSearchToPath(to, workspaceSearch)}
                          active={isNavPathActive(location.pathname, to)}
                          expanded={sidebarExpanded}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                <NavItem
                  label="Modulos"
                  description="Escolher aplicativo"
                  icon={<PanelsTopLeft size={18} strokeWidth={2} />}
                  to="/aplicativos"
                  active={false}
                  expanded={sidebarExpanded}
                />
              </nav>

              <button
                type="button"
                onClick={toggleSidebarLock}
                aria-label={
                  sidebarLockMode === 'auto'
                    ? 'Travar menu lateral'
                    : sidebarLockMode === 'open'
                      ? 'Manter menu lateral fechado'
                      : 'Voltar menu lateral para automatico'
                }
                aria-pressed={sidebarLocked}
                title={
                  sidebarLockMode === 'auto'
                    ? 'Automatico: passe o mouse para expandir'
                    : sidebarLockMode === 'open'
                      ? 'Travado aberto'
                      : 'Travado fechado'
                }
                className={cn(
                  'mt-2 inline-flex h-8 items-center justify-center gap-1.5 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[10.5px] font-semibold text-[var(--admin-text-secondary)] transition hover:bg-[var(--admin-panel-active)] hover:text-[var(--admin-text-primary)]',
                  sidebarExpanded ? 'px-2' : 'w-8 self-center',
                )}
              >
                {sidebarLockMode === 'closed' ? (
                  <ChevronsRight size={15} />
                ) : sidebarLockMode === 'open' ? (
                  <ChevronsLeft size={15} />
                ) : (
                  <LockKeyhole size={14} />
                )}
                {sidebarExpanded ? (
                  <span className="truncate">
                    {sidebarLockMode === 'auto'
                      ? 'Travar'
                      : sidebarLockMode === 'open'
                        ? 'Fechar'
                        : 'Auto'}
                  </span>
                ) : null}
              </button>
            </motion.aside>
          </motion.div>

          <div className="flex min-h-screen min-w-0 flex-1 flex-col pb-22 lg:h-full lg:min-h-0 lg:pb-0">
            <header className="sticky top-0 z-30 shrink-0 px-3 pt-3 sm:px-4 lg:px-0 lg:pt-0">
              <div className="w-full rounded-none border-x-0 border-t-0 border-b border-[var(--admin-border)] bg-[var(--admin-shell)] px-3 py-1.5 shadow-none sm:px-4">
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-1.5 text-[9px] font-medium uppercase tracking-[0.1em] text-[var(--admin-text-muted)]">
                      <span className="min-w-0 truncate">Neo {experienceProductName(experience)}</span>
                      <span aria-hidden="true" className="h-1 w-1 shrink-0 rounded-full bg-[var(--admin-text-muted)]" />
                      <span className="min-w-0 truncate">{tabLabels[currentSection] ?? fallbackSectionLabel(experience)}</span>
                    </div>
                    <h1 className="mt-0.5 truncate text-[0.95rem] font-semibold leading-5 tracking-normal text-[var(--admin-text-primary)]">
                      {tabLabels[currentSection] ?? fallbackSectionLabel(experience)}
                    </h1>
                    <div className="mt-1 flex min-w-[8rem] max-w-[13rem] items-center gap-1.5 sm:hidden">
                      <span className="truncate text-[11px] font-semibold text-[var(--admin-text-primary)]">{userFirstName}</span>
                      <span aria-hidden="true" className="h-1 w-1 shrink-0 rounded-full bg-[var(--admin-text-muted)]" />
                      <span className="truncate text-[10px] text-[var(--admin-text-secondary)]">Perfil {activeProfile}</span>
                    </div>
                  </div>

                  <div className="flex min-w-0 items-center gap-1.5">
                    <div className="hidden min-w-[7rem] text-right sm:block">
                        <p className="truncate text-[11px] font-semibold text-[var(--admin-text-primary)]">
                          {userDisplayName}
                        </p>
                        <p className="truncate text-[10px] text-[var(--admin-text-secondary)]">
                          {activeProfile}
                        </p>
                    </div>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)]">
                      <UserRound size={15} />
                    </div>
                    {experience === 'administracao' ? null : (
                      <Select
                        aria-label="Modulo atual"
                        data-testid="module-switch"
                        selectedKey={activeModule?.code ?? null}
                        onSelectionChange={(key) => handleModuleChange(String(key))}
                        className="shrink-0"
                      >
                        <div title={activeModule?.name ?? 'Mudar modulo'}>
                          <AriaButton className="flex h-8 max-w-36 items-center gap-1.5 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2 text-left text-[var(--admin-text-primary)] outline-none transition hover:bg-[var(--admin-surface-3)] data-[focus-visible]:border-[var(--admin-border-strong)] data-[open]:border-[var(--admin-border-strong)] data-[open]:bg-[var(--admin-panel-active)]">
                            <PanelsTopLeft size={14} className="shrink-0 text-[var(--admin-text-secondary)]" />
                            <SelectValue className="min-w-0 flex-1 truncate text-[11px] font-semibold text-[var(--admin-text-primary)]">
                              {({ selectedText }) => selectedText || 'Modulos'}
                            </SelectValue>
                            <ChevronDown size={13} className="shrink-0 text-[var(--admin-text-secondary)]" />
                          </AriaButton>
                        </div>
                        <Popover className="min-w-(--trigger-width) overflow-hidden rounded-[6px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-1 shadow-[var(--admin-shadow)]">
                          <ListBox className="max-h-64 overflow-auto outline-none">
                            {availableModules.map((application) => (
                              <ListBoxItem
                                id={application.code}
                                key={application.code}
                                textValue={application.name}
                                className="rounded-[4px] px-3 py-2 text-[11px] font-semibold text-[var(--admin-text-primary)] outline-none transition data-[focused]:bg-[var(--admin-panel-active)] data-[selected]:bg-[var(--admin-surface-2)]"
                              >
                                {application.name}
                              </ListBoxItem>
                            ))}
                          </ListBox>
                        </Popover>
                      </Select>
                    )}
                    {user?.roles.includes('ADMIN') && experience === 'worker' ? (
                      <AdminWorkerPreviewSelector />
                    ) : null}
                    {user?.roles.includes('ADMIN') && experience !== 'administracao' ? (
                      <NavLink
                        to="/administracao"
                        aria-label="Administracao do Neo"
                        title="Administracao do Neo"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)] transition hover:bg-[var(--admin-surface-3)] hover:text-[var(--admin-text-primary)]"
                      >
                        <Settings2 size={15} />
                      </NavLink>
                    ) : null}
                    <ThemeToggleButton />
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label="Encerrar sessao"
                      className="h-8 min-h-8 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2.5 text-[var(--admin-text-secondary)] hover:bg-[var(--admin-panel-active)] hover:text-[var(--admin-text-primary)]"
                      onPress={handleLogout}
                    >
                      <LogOut size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            </header>

            <div className="admin-scrollbar flex-1 px-3 py-3 sm:px-4 sm:py-3.5 lg:min-h-0 lg:overflow-y-auto lg:px-5 lg:py-4">
              <Outlet />
            </div>
          </div>

          {showGlobalSupportDock ? (
            <SupportWorkspaceDock
              supportCase={dockDetailQuery.data?.item ?? null}
              loading={dockDetailQuery.isLoading}
              minimized={dockMinimized}
              messageDraft={dockMessageDraft}
              messageError={dockMessageMutation.isError ? dockMessageMutation.error.message : null}
              messagePending={dockMessageMutation.isPending}
              onMessageDraftChange={setDockMessageDraft}
              onToggleMinimized={toggleSupportDockMinimized}
              onOpenCase={openSupportDockCase}
              onClose={closeSupportDock}
              onSendMessage={sendDockMessage}
            />
          ) : null}

          <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--admin-border)] bg-[color:var(--admin-shell)] px-2 py-2 backdrop-blur-[2px] lg:hidden">
            {mobileMoreOpen && secondaryMobileNavigation.length ? (
              <div className="mx-auto mb-2 max-w-xl rounded-[6px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-1 shadow-[var(--admin-shadow)]">
                {secondaryMobileNavigation.map(({ label, description, icon: Icon, to }) => (
                  <NavLink
                    key={to}
                    to={appendSearchToPath(to, workspaceSearch)}
                    onClick={() => setMobileMoreOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2 rounded-[5px] border px-2 py-2 text-left transition',
                        isActive || isNavPathActive(location.pathname, to)
                          ? 'border-[var(--admin-border-strong)] bg-[var(--admin-panel-active)] text-[var(--admin-text-primary)]'
                          : 'border-transparent text-[var(--admin-text-secondary)] hover:border-[var(--admin-border)] hover:bg-[var(--admin-surface-2)] hover:text-[var(--admin-text-primary)]',
                      )
                    }
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)]">
                      <Icon size={17} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-semibold">{label}</span>
                      <span className="block truncate text-[10px] text-current/58">{description}</span>
                    </span>
                  </NavLink>
                ))}
              </div>
            ) : null}
            <div
              className={cn(
                'mx-auto grid max-w-xl gap-1',
                secondaryMobileNavigation.length ? 'grid-cols-5' : primaryMobileNavigation.length >= 6 ? 'grid-cols-6' : 'grid-cols-5',
              )}
            >
              {primaryMobileNavigation.map(({ label, icon: Icon, to }) => (
                <NavLink
                  key={to}
                  to={appendSearchToPath(to, workspaceSearch)}
                  end
                  onClick={() => setMobileMoreOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-[6px] border px-1 text-[10px] font-medium transition',
                      isActive || isNavPathActive(location.pathname, to)
                        ? 'border-[var(--admin-border-strong)] bg-[var(--admin-panel-active)] text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)]'
                        : 'border-transparent text-[var(--admin-text-muted)] hover:border-[var(--admin-border)] hover:bg-[var(--admin-surface-2)] hover:text-[var(--admin-text-primary)]',
                    )
                  }
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </NavLink>
              ))}
              {secondaryMobileNavigation.length ? (
                <button
                  type="button"
                  onClick={() => setMobileMoreOpen((current) => !current)}
                  aria-expanded={mobileMoreOpen}
                  aria-label="Mais opções"
                  className={cn(
                    'flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-[6px] border px-1 text-[10px] font-medium transition',
                    mobileMoreOpen
                      ? 'border-[var(--admin-border-strong)] bg-[var(--admin-panel-active)] text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)]'
                      : 'border-transparent text-[var(--admin-text-muted)] hover:border-[var(--admin-border)] hover:bg-[var(--admin-surface-2)] hover:text-[var(--admin-text-primary)]',
                  )}
                >
                  <MoreHorizontal size={18} />
                  <span>Mais</span>
                </button>
              ) : null}
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}

function AdminWorkerPreviewSelector() {
  const { selectedWorker, setSelectedWorker, clearSelectedWorker } = useAdminWorkerPreview();
  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState<DrakeWorkerPreview[]>([]);
  const [expanded, setExpanded] = useState(false);
  const workersMutation = useMutation({ mutationFn: findDrakeWorkers });

  const searchWorkers = () => {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 3 || workersMutation.isPending) {
      return;
    }

    workersMutation.mutate(normalizedQuery, {
      onSuccess: (result) => {
        setCandidates(result.items);
        setExpanded(true);
      },
    });
  };

  const selectWorker = (worker: DrakeWorkerPreview) => {
    setSelectedWorker(worker);
    setCandidates([]);
    setQuery('');
    setExpanded(false);
  };

  return (
    <div className="relative min-w-0">
      {expanded || !selectedWorker ? (
        <div className="flex h-8 w-[min(44vw,18rem)] min-w-[12rem] items-center gap-1.5 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2 text-[var(--admin-text-secondary)] focus-within:border-[var(--admin-border-strong)] focus-within:bg-[var(--admin-panel-active)]">
          <Search size={13} className="shrink-0 text-[var(--admin-text-muted)]" />
          <input
            type="search"
            aria-label="Selecionar colaborador para validar Jornada"
            placeholder="Selecionar colaborador"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            onFocus={() => setExpanded(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                searchWorkers();
              }
              if (event.key === 'Escape') {
                setExpanded(false);
              }
            }}
            className="min-w-0 flex-1 bg-transparent text-[11px] font-semibold text-[var(--admin-text-primary)] outline-none placeholder:text-[var(--admin-text-muted)]"
          />
          <button
            type="button"
            onClick={searchWorkers}
            disabled={query.trim().length < 3 || workersMutation.isPending}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-3)] text-[var(--admin-text-secondary)] transition hover:bg-[var(--admin-panel-active)] hover:text-[var(--admin-text-primary)] disabled:opacity-45"
            aria-label="Buscar colaborador"
          >
            <Search size={12} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="grid h-8 max-w-[18rem] min-w-[12rem] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1.5 rounded-[4px] border border-[var(--admin-border-strong)] bg-[var(--admin-panel-active)] px-2 text-left text-[var(--admin-text-primary)] transition hover:border-[var(--admin-accent-border)] hover:bg-[var(--admin-accent-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-strong)]"
          aria-label={`Colaborador em validação: ${selectedWorker.fullName}. Clique para trocar.`}
          title="Trocar colaborador em validação"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-[4px] border border-[var(--admin-accent-border)] bg-[var(--admin-surface-2)] text-[var(--admin-accent-text)]">
            <RefreshCw size={11} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[11px] font-semibold">{selectedWorker.fullName}</span>
            <span className="block truncate text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-accent-text)]">
              trocar colaborador
            </span>
          </span>
          <ChevronDown size={13} className="shrink-0 text-[var(--admin-accent-text)]" />
        </button>
      )}

      {expanded && (candidates.length > 0 || workersMutation.isError || selectedWorker) ? (
        <div className="admin-scrollbar absolute right-0 top-9 z-50 grid max-h-[min(70vh,24rem)] w-[min(82vw,24rem)] gap-1 overflow-y-auto rounded-[6px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-1.5 shadow-[var(--admin-shadow)]">
          {selectedWorker ? (
            <div className="flex items-center justify-between gap-2 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2 py-1.5">
              <div className="min-w-0">
                <p className="truncate text-[11.5px] font-semibold text-[var(--admin-text-primary)]">{selectedWorker.fullName}</p>
                <p className="truncate text-[10.5px] text-[var(--admin-text-muted)]">
                  {[selectedWorker.employeeNumber, selectedWorker.operationalUnitName].filter(Boolean).join(' - ') || 'Sem matricula vinculada'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  clearSelectedWorker();
                  setCandidates([]);
                }}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] border border-[var(--admin-border)] text-[var(--admin-text-secondary)] transition hover:bg-[var(--admin-panel-active)] hover:text-[var(--admin-text-primary)]"
                aria-label="Limpar colaborador em validação"
              >
                <X size={13} />
              </button>
            </div>
          ) : null}
          {workersMutation.isError ? (
            <p className="px-2 py-1 text-[11px] font-medium text-[var(--admin-danger-text)]">
              {workersMutation.error.message}
            </p>
          ) : null}
          {candidates.map((worker) => (
            <button
              key={worker.previewReference}
              type="button"
              onClick={() => selectWorker(worker)}
              className="grid min-w-0 rounded-[4px] px-2 py-1.5 text-left transition hover:bg-[var(--admin-panel-active)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-strong)]"
            >
              <span className="min-w-0 text-[11.5px] font-semibold leading-4 text-[var(--admin-text-primary)]">
                {worker.fullName}
              </span>
              <span className="min-w-0 truncate text-[10.5px] leading-4 text-[var(--admin-text-muted)]">
                {[worker.employeeNumber, worker.operationalUnitName].filter(Boolean).join(' - ') || 'Sem matricula vinculada'}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function sidebarLockModeFromStorage(): SidebarLockMode {
  const storedMode = localStorage.getItem(sidebarLockStorageKey);

  if (storedMode === 'open' || storedMode === 'closed') {
    return storedMode;
  }

  return 'auto';
}

function supportWorkspaceMinimizedFromStorage() {
  return localStorage.getItem(supportWorkspaceMinimizedStorageKey) === '1';
}

function sectionKeyFromPath(pathname: string) {
  return pathname.replace(/^\//, '') || 'inbox';
}

function isNavPathActive(pathname: string, to: string) {
  if (pathname === to) {
    return true;
  }

  return to === '/atendimentos/configuracao'
    ? pathname.startsWith('/atendimentos/configuracao/')
    : false;
}

function appendSearchToPath(path: string, search: string) {
  if (!search) {
    return path;
  }

  return `${path}${search}`;
}

function groupNavigationItems(items: Array<(typeof navigation)[number]>) {
  return items.reduce<Array<{ key: NavigationGroup; items: Array<(typeof navigation)[number]> }>>(
    (groups, item) => {
      const group = groups.find((current) => current.key === item.group);

      if (group) {
        group.items.push(item);
        return groups;
      }

      groups.push({ key: item.group, items: [item] });
      return groups;
    },
    [],
  );
}

function supportWorkspaceSearchFromLocation(search: string, isSupportOperator: boolean) {
  if (!isSupportOperator) {
    return '';
  }

  const params = new URLSearchParams(search);
  const caseId = params.get('caso');
  const dock = params.get('dock');

  if (!caseId || dock !== '1') {
    return '';
  }

  const preserved = new URLSearchParams();
  preserved.set('dock', '1');
  preserved.set('caso', caseId);
  preserved.set('aba', params.get('aba') === 'gestao' ? 'gestao' : 'conversa');

  return `?${preserved.toString()}`;
}

function supportWorkspaceDraftStorageKey(caseId: string) {
  return `${supportWorkspaceDraftStorageKeyPrefix}${caseId}`;
}

function experienceApplicationCode(experience: ShellExperience) {
  if (experience === 'atendimento') {
    return 'TICKETS';
  }

  if (experience === 'quick-forms') {
    return 'QUICK_FORMS';
  }

  return experience === 'administracao' ? null : 'JORNADA';
}

function experienceProductName(experience: ShellExperience) {
  if (experience === 'atendimento') {
    return 'Tickets';
  }

  if (experience === 'quick-forms') {
    return 'QuickForms';
  }

  return experience === 'administracao' ? 'Administração' : 'Jornada';
}

function fallbackSectionLabel(experience: ShellExperience) {
  if (experience === 'atendimento') {
    return 'Atendimentos';
  }

  if (experience === 'quick-forms') {
    return 'Formularios';
  }

  return experience === 'administracao' ? 'Visão geral' : 'Inbox';
}

function profileLabel(roles: string[] | null | undefined) {
  if (roles?.includes('ADMIN')) {
    return 'Administrador';
  }

  if (roles?.includes('SUPPORT')) {
    return 'Atendimento';
  }

  if (roles?.includes('TI')) {
    return 'Tecnologia';
  }

  return 'Colaborador';
}

function firstNameLabel(value: string) {
  const trimmed = value.trim();
  return trimmed.split(/\s+/)[0] || trimmed || 'Usuario';
}

function canAccessNavigationItem({
  applications,
  itemApplicationCode,
  itemRoles,
  userRoles,
}: {
  applications: Array<{ code: string } | null | undefined> | null | undefined;
  itemApplicationCode?: ModuleApplicationCode;
  itemRoles?: string[];
  userRoles: string[] | null | undefined;
}) {
  if (!itemApplicationCode) {
    return itemRoles?.some((role) => userRoles?.includes(role)) ?? true;
  }

  const hasAppAccess = hasApplicationAccess(applications, itemApplicationCode);

  if (!hasAppAccess) {
    if (itemApplicationCode !== 'TICKETS') {
      return false;
    }

    if (!isSupportOperatorUser({ roles: userRoles ?? [] })) {
      return false;
    }
  }

  if (!itemRoles?.length) {
    return true;
  }

  return itemRoles.some((role) => userRoles?.includes(role));
}

function SupportWorkspaceDock({
  supportCase,
  loading,
  minimized,
  messageDraft,
  messagePending,
  messageError,
  onMessageDraftChange,
  onToggleMinimized,
  onSendMessage,
  onOpenCase,
  onClose,
}: {
  supportCase: SupportCaseDetail | null;
  loading: boolean;
  minimized: boolean;
  messageDraft: string;
  messagePending: boolean;
  messageError: string | null;
  onMessageDraftChange: (value: string) => void;
  onToggleMinimized: () => void;
  onSendMessage: () => void;
  onOpenCase: () => void;
  onClose: () => void;
}) {
  const messages = supportCase?.messages ?? [];
  const subtitle = supportCase
    ? `${supportCase.requester.name} • ${supportCase.department?.name ?? 'Nao classificado'}`
    : 'Atendimento em andamento';
  const statusLabel = supportCase ? supportWorkspaceStatusLabel(supportCase.status) : 'carregando';

  if (minimized) {
    return (
      <aside className="pointer-events-none absolute inset-y-0 right-0 z-30 hidden items-end justify-end p-2.5 lg:flex">
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={onToggleMinimized}
            aria-label="Reabrir workspace do atendimento"
            className="flex min-h-14 min-w-[15rem] items-center justify-between gap-3 rounded-[6px] border border-[var(--admin-border-strong)] bg-[var(--admin-shell)] px-3 py-2 text-left shadow-[var(--admin-shadow)] backdrop-blur-[3px]"
          >
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-text-muted)]">
                <MessageSquare size={13} />
                Workspace ativo
              </span>
              <span className="mt-1 block truncate text-[12px] font-semibold text-[var(--admin-text-primary)]">
                {supportCase?.title ?? 'Atendimento em andamento'}
              </span>
              <span className="block truncate text-[10.5px] text-[var(--admin-text-secondary)]">
                {supportCase ? `${supportCase.code} • ${statusLabel}` : 'Clique para retomar'}
              </span>
            </span>
            <ChevronRight size={16} className="shrink-0 text-[var(--admin-text-secondary)]" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar workspace do atendimento"
            className="inline-flex h-8 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2 text-[10px] font-semibold text-[var(--admin-text-secondary)] transition hover:bg-[var(--admin-panel-active)] hover:text-[var(--admin-text-primary)]"
          >
            Fechar
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="pointer-events-none absolute inset-y-0 right-0 z-30 hidden w-[min(34rem,calc(100%-1.5rem))] p-2.5 lg:block">
      <div className="pointer-events-auto flex h-full flex-col overflow-hidden rounded-[6px] border border-[var(--admin-border-strong)] bg-[var(--admin-shell)] shadow-[var(--admin-shadow)] backdrop-blur-[3px]">
        <div className="flex items-start justify-between gap-2 border-b border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-3 py-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-text-muted)]">
              <MessageSquare size={13} />
              Workspace ativo
            </div>
            <p className="mt-1 truncate text-[12.5px] font-semibold text-[var(--admin-text-primary)]">
              {supportCase?.title ?? 'Carregando atendimento'}
            </p>
            <p className="truncate text-[10.5px] text-[var(--admin-text-secondary)]">
              {supportCase ? `${supportCase.code} • ${subtitle}` : subtitle}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onToggleMinimized}
              aria-label="Minimizar workspace do atendimento"
              className="inline-flex h-8 w-8 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)] transition hover:bg-[var(--admin-panel-active)] hover:text-[var(--admin-text-primary)]"
            >
              <ChevronsRight size={14} />
            </button>
            <button
              type="button"
              onClick={onOpenCase}
              className="inline-flex h-8 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2 text-[10px] font-semibold text-[var(--admin-text-secondary)] transition hover:bg-[var(--admin-panel-active)] hover:text-[var(--admin-text-primary)]"
            >
              Abrir atendimento
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar workspace do atendimento"
              className="inline-flex h-8 w-8 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)] transition hover:bg-[var(--admin-panel-active)] hover:text-[var(--admin-text-primary)]"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden bg-[var(--admin-surface-1)]">
          {supportCase ? (
            <div className="grid grid-cols-3 gap-px border-b border-[var(--admin-border)] bg-[var(--admin-border)]">
              <SupportWorkspaceMetaTile label="Status" value={statusLabel} />
              <SupportWorkspaceMetaTile
                label="Equipe"
                value={supportCase.teamName ?? supportCase.department?.name ?? 'Nao definida'}
              />
              <SupportWorkspaceMetaTile label="Solicitante" value={supportCase.requester.name} />
            </div>
          ) : null}
          {loading ? (
            <div className="admin-scrollbar h-full overflow-y-auto p-3">
              <div className="rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2.5 py-2 text-[12px] text-[var(--admin-text-secondary)]">
                Carregando conversa...
              </div>
            </div>
          ) : messages.length > 0 ? (
            <div className="admin-scrollbar h-full overflow-y-auto bg-[linear-gradient(180deg,rgba(255,255,255,0.025),transparent_18%,transparent_82%,rgba(0,0,0,0.12))] px-3 py-3">
              <div className="grid gap-2">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn('flex', message.mine ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      className={cn(
                        'max-w-[88%] rounded-[6px] border px-2.5 py-2 shadow-[var(--admin-shadow)]',
                        message.mine
                          ? 'border-[var(--admin-border-strong)] bg-[var(--admin-panel-active)]'
                          : 'border-[var(--admin-border)] bg-[var(--admin-surface-2)]',
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-[10.5px] font-semibold text-[var(--admin-text-secondary)]">
                          {message.mine ? 'Voce' : message.senderName}
                        </p>
                        <p className="shrink-0 text-[9.5px] text-[var(--admin-text-muted)]">
                          {formatWorkspaceDate(message.createdAt)}
                        </p>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap break-words text-[12px] leading-5 text-[var(--admin-text-primary)]">
                        {message.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="admin-scrollbar h-full overflow-y-auto p-3">
              <div className="rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2.5 py-2 text-[12px] text-[var(--admin-text-secondary)]">
                A conversa do atendimento aparece aqui.
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-2">
          <label className="flex min-h-10 min-w-0 items-end gap-2 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-2.5 py-1.5 text-[12px] text-[var(--admin-text-secondary)] focus-within:border-[var(--admin-border-strong)]">
            <textarea
              aria-label="Responder pelo workspace"
              placeholder="Responder sem sair da pagina..."
              value={messageDraft}
              onChange={(event) => onMessageDraftChange(event.currentTarget.value)}
              rows={1}
              className="max-h-24 min-h-8 min-w-0 flex-1 resize-none bg-transparent py-1 text-[12px] leading-5 text-[var(--admin-text-primary)] outline-none placeholder:text-[var(--admin-text-muted)]"
            />
            <button
              type="button"
              onClick={onSendMessage}
              aria-label="Enviar mensagem pelo workspace"
              disabled={!messageDraft.trim() || messagePending}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-panel-active)] text-[var(--admin-text-primary)] disabled:opacity-50"
            >
              <Send size={13} />
            </button>
          </label>
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="truncate text-[10.5px] text-[var(--admin-text-muted)]">
              Use o dock para conversar e volte ao caso completo para gerir status.
            </p>
            {messageError ? (
              <p className="shrink-0 text-[10.5px] text-[#ef4444]">{messageError}</p>
            ) : null}
          </div>
        </div>
      </div>
    </aside>
  );
}

function supportWorkspaceStatusLabel(status: SupportCaseDetail['status']) {
  const labels: Record<SupportCaseDetail['status'], string> = {
    NEW: 'novo',
    OPEN: 'em atendimento',
    WAITING_REQUESTER: 'aguardando',
    WAITING_INTERNAL: 'interno',
    WAITING_APPROVAL: 'aprovação',
    RESOLVED: 'resolvido',
    CLOSED: 'fechado',
  };

  return labels[status];
}

function SupportWorkspaceMetaTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="bg-[var(--admin-surface-2)] px-2.5 py-2">
      <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-text-muted)]">
        {label}
      </p>
      <p className="mt-1 truncate text-[11px] font-semibold text-[var(--admin-text-primary)]">
        {value}
      </p>
    </div>
  );
}

function formatWorkspaceDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function AdminSpaceBackdrop() {
  const backdropRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const target = backdropRef.current;

    if (!target) {
      return;
    }

    let frame = 0;

    const updateScroll = () => {
      frame = 0;
      const scrollY = Math.max(0, window.scrollY);
      target.style.setProperty('--admin-scroll', `${scrollY}px`);
    };

    const handleScroll = () => {
      if (frame !== 0) {
        return;
      }

      frame = window.requestAnimationFrame(updateScroll);
    };

    updateScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, []);

  return (
    <div ref={backdropRef} aria-hidden="true" className="admin-space-scene">
      <div className="admin-space-gradient" />
      <div className="admin-space-glow" />
      <div className="admin-space-stars" />
      {staticPlanets.map(({ left, top, size, colors, ring, ringTone, opacity, depth, driftX, driftY, duration, delay }, index) => (
        <div
          key={`${left}-${top}-${index}`}
          className="admin-space-object absolute"
          style={
            {
              left,
              top,
              opacity,
              '--depth': depth,
              '--drift-x': `${driftX}px`,
              '--drift-y': `${driftY}px`,
              '--float-duration': `${duration}s`,
              '--float-delay': `${delay}s`,
            } as CSSProperties
          }
        >
          <span
            className={`auth-planet ${ring ? 'auth-planet-ringed' : ''}`}
            style={
              {
                '--planet-size': `${size}px`,
                '--planet-a': colors[0],
                '--planet-b': colors[1],
                '--planet-c': colors[2],
                '--planet-ring': ringTone ?? 'rgba(248, 250, 252, 0.42)',
              } as CSSProperties
            }
          >
            {ring ? <span className="auth-planet-ring-front" /> : null}
          </span>
        </div>
      ))}
      {staticSatellites.map(({ left, top, scale, rotate, opacity, depth, driftX, driftY, duration, delay }, index) => (
        <div
          key={`satellite-${left}-${top}-${index}`}
          className="admin-space-object absolute"
          style={
            {
              left,
              top,
              opacity,
              '--depth': depth,
              '--drift-x': `${driftX}px`,
              '--drift-y': `${driftY}px`,
              '--float-duration': `${duration}s`,
              '--float-delay': `${delay}s`,
              '--satellite-scale': scale,
              '--satellite-rotate': `${rotate}deg`,
            } as CSSProperties
          }
        >
          <span className="admin-space-satellite">
            <span className="auth-satellite">
              <span className="auth-satellite-panel auth-satellite-panel-left" />
              <span className="auth-satellite-body" />
              <span className="auth-satellite-panel auth-satellite-panel-right" />
            </span>
          </span>
        </div>
      ))}
      <div className="admin-space-vignette" />
    </div>
  );
}

function NavItem({
  label,
  description,
  icon,
  to,
  active,
  expanded,
}: {
  label: string;
  description: string;
  icon: ReactNode;
  to: string;
  active: boolean;
  expanded: boolean;
}) {
  return (
    <NavLink to={to} end aria-label={label} title={expanded ? undefined : label}>
      {({ isActive }) => {
        const selected = active || isActive;

        return (
          <div
            className={cn(
              'flex items-center rounded-[5px] border py-1.5 transition',
              expanded ? 'gap-2 px-2' : 'justify-center px-1',
              selected
                ? 'border-[var(--admin-border-strong)] bg-[var(--admin-panel-active)] text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)]'
                : 'border-transparent bg-transparent text-[var(--admin-text-secondary)] hover:border-[var(--admin-border)] hover:bg-[var(--admin-surface-2)] hover:text-[var(--admin-text-primary)]',
            )}
          >
            <div
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] border transition',
                selected
                  ? 'border-[var(--admin-border-strong)] bg-[var(--admin-panel-active)] text-[var(--admin-text-primary)]'
                  : 'border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)]',
              )}
            >
              {icon}
            </div>
            <AnimatePresence initial={false}>
              {expanded ? (
                <motion.div
                  key="nav-copy"
                  initial={false}
                  animate={{ opacity: 1, x: 0, width: 'auto' }}
                  exit={{ opacity: 0, x: -6, width: 0 }}
                  transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                  className="min-w-0 overflow-hidden"
                >
                  <p className="truncate text-[11px] font-semibold">{label}</p>
                  <p className="truncate text-[10px] text-current/58">{description}</p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      }}
    </NavLink>
  );
}
