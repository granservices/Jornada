import { useState } from 'react';
import {
  ArrowRight,
  Bell,
  CalendarDays,
  ChevronDown,
  FileText,
  Grid2X2,
  Headset,
  Info,
  LogOut,
  Search,
  Settings,
  UserRound,
} from 'lucide-react';
import { GridList, GridListItem } from 'react-aria-components/GridList';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { clearAuthSession } from '../features/auth/auth-session';
import { defaultRouteForAuthenticatedUser } from '../features/auth/auth-routing';
import { applicationEntryHref, isExternalHref } from '../features/auth/application-entry';
import { useAuthSession } from '../features/auth/use-auth-session';
import { cn } from '../lib/cn';

type ModuleCategory = 'todos' | 'jornada' | 'Tickets' | 'quickforms' | 'neo';
type ModuleApplicationCode = 'JORNADA' | 'TICKETS' | 'QUICK_FORMS' | 'NEO';

type ModuleCard = {
  id: string;
  title: string;
  description: string;
  detail: string;
  category: Exclude<ModuleCategory, 'todos'>;
  icon: typeof CalendarDays;
  applicationCode: ModuleApplicationCode;
  to: string;
  tone: 'red' | 'amber' | 'neutral' | 'dark';
  imageSrc?: string;
  enabled: boolean;
  kind: 'PRODUCT' | 'PLATFORM';
};

const categoryFilters: Array<{ id: ModuleCategory; label: string; icon: typeof Grid2X2 }> = [
  { id: 'todos', label: 'Todos', icon: Grid2X2 },
  { id: 'jornada', label: 'Jornada', icon: CalendarDays },
  { id: 'Tickets', label: 'Tickets', icon: Headset },
  { id: 'quickforms', label: 'QuickForms', icon: FileText },
  { id: 'neo', label: 'Neo', icon: Settings },
];

export function ApplicationsPage({
  alwaysShowCatalog = false,
}: {
  alwaysShowCatalog?: boolean;
}) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const session = useAuthSession();
  const applications = session?.applications ?? [];
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const searchTerm = searchParams.get('q') ?? '';
  const activeCategory = (searchParams.get('categoria') as ModuleCategory | null) ?? 'todos';
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('pt-BR');

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!alwaysShowCatalog && applications.length <= 1) {
    return (
      <Navigate
        to={defaultRouteForAuthenticatedUser(session.user, applications)}
        replace
      />
    );
  }

  const moduleCards = buildModuleCards(session);
  const filteredModules = moduleCards.filter((module) => {
    const matchesCategory = activeCategory === 'todos' || module.category === activeCategory;
    const matchesSearch = `${module.title} ${module.description} ${module.detail}`
      .toLocaleLowerCase('pt-BR')
      .includes(normalizedSearch);

    return matchesCategory && matchesSearch;
  });

  function updateSearch(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value.trim()) {
      next.set('q', value);
    } else {
      next.delete('q');
    }
    setSearchParams(next, { replace: true });
  }

  function updateCategory(category: ModuleCategory) {
    const next = new URLSearchParams(searchParams);
    if (category === 'todos') {
      next.delete('categoria');
    } else {
      next.set('categoria', category);
    }
    setSearchParams(next, { replace: true });
  }

  function resetCatalogControls() {
    setSearchParams(new URLSearchParams(), { replace: true });
  }

  function openProfile() {
    setUserMenuOpen(false);
    navigate('/perfil');
  }

  function handleLogout() {
    setUserMenuOpen(false);
    clearAuthSession();
    navigate('/login', { replace: true });
  }

  async function openModule(module: ModuleCard) {
    const application = applications.find((item) => module.applicationCode === item.code);
    if (application) {
      const href = applicationEntryHref(application);
      if (isExternalHref(href)) {
        window.location.assign(href);
        return;
      }

      navigate(href);
      return;
    }

    navigate(module.to);
  }

  return (
    <main className="min-h-screen bg-[var(--admin-canvas)] font-[var(--admin-font-ui)] text-[var(--admin-text-primary)]">
      <section className="relative isolate min-h-[20.75rem] overflow-hidden bg-[#07111d] px-4 pb-20 pt-3 text-white sm:px-8 lg:min-h-[21.75rem] lg:px-14">
        <img src="/neo-offshore-platform.png" alt="" className="absolute inset-0 h-full w-full scale-x-[-1] object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,12,21,0.94)_0%,rgba(8,16,27,0.78)_36%,rgba(8,16,27,0.42)_72%,rgba(5,12,21,0.38)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(180deg,rgba(229,233,238,0)_0%,var(--admin-canvas)_100%)]" />
        <div className="pointer-events-none absolute -left-[9rem] top-[-18rem] h-[37rem] w-[37rem] rounded-full border border-[var(--admin-border-strong)]/35" />
        <div className="pointer-events-none absolute right-[6%] top-[5rem] h-[25rem] w-[25rem] rounded-full border border-[var(--admin-border-strong)]/22" />
        <div className="pointer-events-none absolute left-[42%] top-[-13rem] h-[32rem] w-[32rem] rounded-full border border-[var(--admin-border-strong)]/16" />

        <div className="relative z-10 mx-auto max-w-[92rem]">
          <header className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <img src="/crew-logo.png" alt="" className="h-7 w-7 shrink-0 object-contain" />
              <p className="truncate text-[17px] font-medium leading-6">
                Neo <span className="font-bold">Jornada</span>
              </p>
              <div className="hidden h-8 w-px bg-white/24 sm:block" />
              <p className="hidden text-[10px] font-semibold uppercase leading-4 tracking-[0.16em] text-white/68 md:block">
                Pessoas em movimento<br />um mar de possibilidades
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                aria-label="Abrir comunicados"
                onClick={() => navigate('/comunicados')}
                className="relative hidden h-8 w-8 items-center justify-center rounded-[4px] border border-white/14 bg-white/[0.04] text-white/78 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 sm:flex"
              >
                <Bell size={16} />
                <span className="absolute right-2 top-1.5 h-2 w-2 rounded-full bg-[var(--admin-border-strong)]" />
              </button>
              <button
                type="button"
                aria-label="Ver todos os módulos"
                onClick={resetCatalogControls}
                className="hidden h-8 w-8 items-center justify-center rounded-[4px] border border-white/14 bg-white/[0.04] text-white/78 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 sm:flex"
              >
                <Grid2X2 size={16} />
              </button>
              <div className="relative pl-1 sm:border-l sm:border-white/18 sm:pl-5">
                <button
                  type="button"
                  aria-label="Abrir menu do usuário"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                  onClick={() => setUserMenuOpen((current) => !current)}
                  className="flex items-center gap-3 rounded-[4px] text-left transition hover:bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#202b38] text-[11px] font-semibold text-white shadow-[0_18px_34px_rgba(0,0,0,0.22)]">
                    {initials(session.user.fullName)}
                  </span>
                  <span className="hidden min-w-0 sm:block">
                    <span className="block truncate text-[13px] font-semibold leading-4">{session.user.fullName}</span>
                    <span className="block truncate text-[12px] text-white/60">{session.user.roles.includes('ADMIN') ? 'Administrador' : 'Offshore'}</span>
                  </span>
                  <ChevronDown size={15} className={cn('hidden text-white/70 transition sm:block', userMenuOpen && 'rotate-180')} />
                </button>
                <div
                  role="menu"
                  aria-label="Menu do usuário"
                  hidden={!userMenuOpen}
                  className={cn(
                    'absolute right-0 top-[calc(100%+0.5rem)] z-30 w-56 overflow-hidden rounded-[6px] border border-white/16 bg-[#111923]/95 p-1.5 text-white shadow-[0_22px_50px_-32px_rgba(0,0,0,0.9)] backdrop-blur-sm',
                    userMenuOpen ? 'block' : '',
                  )}
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={openProfile}
                    className="flex h-9 w-full items-center gap-2 rounded-[4px] px-2.5 text-left text-[12px] font-semibold text-white/82 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    <UserRound size={15} />
                    Perfil
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="flex h-9 w-full items-center gap-2 rounded-[4px] px-2.5 text-left text-[12px] font-semibold text-white/82 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    <LogOut size={15} />
                    Sair
                  </button>
                </div>
              </div>
            </div>
          </header>

          <div className="mt-7 max-w-[40rem] lg:mt-8">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f0c3c7]">Módulos</p>
            <h1
              aria-label="A informação ao seu alcance."
              className="max-w-[34rem] text-[clamp(1.82rem,3vw,2.78rem)] font-medium leading-[1.03] tracking-[-0.02em] text-white"
            >
              A informação<br />
              <span className="font-extrabold">ao seu alcance.</span>
            </h1>
            <p className="mt-2 max-w-[36rem] text-[12px] leading-5 text-white/78">
              Acesse os módulos da sua jornada e mantenha sua rotina sempre em movimento.
            </p>
          </div>

          <div className="mt-4 max-w-[36rem]">
            <label className="flex h-9 items-center gap-2 rounded-[3px] border border-white/24 bg-white/[0.07] px-3 text-white/72 shadow-[0_18px_35px_rgba(0,0,0,0.12)] transition focus-within:border-white/52 focus-within:bg-white/[0.11]">
              <Search size={16} className="shrink-0" />
              <input
                type="search"
                aria-label="Buscar módulos"
                placeholder="Buscar módulo, serviço ou informação..."
                value={searchTerm}
                onChange={(event) => updateSearch(event.currentTarget.value)}
                className="min-w-0 flex-1 bg-transparent text-[12px] text-white outline-none placeholder:text-white/55"
              />
              <span className="hidden h-5 items-center rounded-[3px] bg-white/10 px-1.5 text-[10px] font-semibold text-white/70 sm:inline-flex">⌘ K</span>
            </label>
          </div>

          <div className="mt-3 flex min-w-0 flex-wrap gap-1.5">
            {categoryFilters.map((filter) => {
              const Icon = filter.icon;
              const selected = activeCategory === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => updateCategory(filter.id)}
                  className={cn(
                    'inline-flex h-8 items-center justify-center gap-1.5 rounded-[4px] border px-2.5 text-[11px] font-semibold transition',
                    selected
                      ? 'border-[var(--admin-border-strong)] bg-[var(--admin-border-strong)] text-white shadow-[0_12px_28px_rgba(159,38,53,0.34)]'
                      : 'border-white/20 bg-white/[0.04] text-white/80 hover:border-white/35 hover:bg-white/[0.1]',
                  )}
                >
                  <Icon size={14} />
                  {filter.label}
                </button>
              );
            })}
          </div>

          <div className="absolute right-[6%] top-[9.8rem] hidden max-w-[9rem] border-l border-[var(--admin-border-strong)] pl-4 text-[9px] font-semibold uppercase leading-4 tracking-[0.18em] text-white/58 xl:block">
            Pessoas<br />processos<br />resultados<br />em movimento
          </div>
        </div>
      </section>

      <section className="relative z-20 mx-auto -mt-14 grid max-w-[92rem] gap-2.5 px-4 pb-2.5 sm:px-8 lg:grid-cols-2 lg:px-14 xl:-mt-16 xl:grid-cols-4">
        <GridList
          aria-label="Módulos disponíveis"
          items={filteredModules}
          layout="grid"
          className="contents"
        >
          {(module) => {
            const Icon = module.icon;
            return (
              <GridListItem
                id={module.id}
                textValue={module.title}
                onAction={() => void openModule(module)}
                className={({ isFocusVisible, isHovered, isPressed }) =>
                  cn(
                    'group relative isolate min-h-[10.15rem] overflow-hidden rounded-[6px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] text-left shadow-[var(--admin-shadow)] outline-none transition duration-200',
                    isHovered && 'z-10 -translate-y-0.5 border-[var(--admin-border-strong)] bg-[var(--admin-surface-2)] shadow-[0_18px_42px_-30px_rgba(16,17,19,0.58)]',
                    isPressed && 'translate-y-px',
                    isFocusVisible && 'ring-2 ring-[var(--focus-ring)] ring-offset-2 ring-offset-[var(--admin-canvas)]',
                  )
                }
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_84%_20%,rgba(159,38,53,0.07),transparent_34%)]" />
                <div className="absolute right-1.5 top-3 h-20 w-28 opacity-82 transition duration-300 group-data-[hovered]:scale-[1.035]">
                  {module.imageSrc ? (
                    <img src={module.imageSrc} alt="" className="h-full w-full object-contain drop-shadow-[0_14px_20px_rgba(15,23,42,0.14)]" />
                  ) : (
                    <ModuleIllustration tone={module.tone} />
                  )}
                </div>
                <div className="relative z-10 flex min-h-[10.15rem] flex-col justify-between p-3 pr-[7.2rem] max-sm:pr-3">
                  <div>
                    <span className={cn('flex h-8 w-8 items-center justify-center rounded-[4px] border text-white shadow-[0_14px_22px_-18px_rgba(15,23,42,0.8)]', moduleToneClass(module.tone))}>
                      <Icon size={15} />
                    </span>
                    <h2 className="mt-2 text-[14px] font-bold leading-5 text-[var(--admin-text-primary)]">{module.title}</h2>
                    <span className="mt-1 inline-flex items-center rounded-[3px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--admin-text-muted)]">
                      {module.kind === 'PLATFORM' ? 'Plataforma' : 'Aplicativo'}
                    </span>
                    <p className="mt-0.5 text-[11px] font-semibold leading-4 text-[var(--admin-text-secondary)]">{module.description}</p>
                    <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-4 text-[var(--admin-text-muted)]">{module.detail}</p>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-[var(--admin-border)] pt-2">
                    <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-[var(--admin-text-secondary)]">
                      Acessar módulo
                    </span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[var(--admin-text-primary)] transition group-data-[hovered]:translate-x-0.5 group-data-[hovered]:border-[var(--admin-border-strong)]">
                      <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              </GridListItem>
            );
          }}
        </GridList>
      </section>

      <section className="mx-auto grid max-w-[92rem] gap-2.5 px-4 pb-3 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,34rem)] lg:px-14">
        <button
          type="button"
          onClick={() => navigate('/atendimento')}
          className="grid min-h-[4rem] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-[6px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-3 text-left shadow-[var(--admin-shadow)] transition hover:border-[var(--admin-border-strong)] hover:bg-[var(--admin-surface-2)]"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)]">
            <Info size={15} />
          </span>
          <span className="min-w-0">
            <span className="block text-[12px] font-bold text-[var(--admin-text-primary)]">Precisa de ajuda?</span>
            <span className="mt-0.5 block text-[11px] text-[var(--admin-text-secondary)]">Acesse a central de ajuda ou entre em contato com o suporte.</span>
          </span>
          <span className="hidden items-center gap-2 text-[11px] font-semibold text-[var(--admin-text-secondary)] sm:flex">
            Ver central de ajuda
            <ArrowRight size={16} />
          </span>
        </button>
        <div className="relative min-h-[4rem] overflow-hidden rounded-[6px] bg-[#0b1521] px-4 py-3 text-white shadow-[0_22px_50px_-34px_rgba(15,23,42,0.95)]">
          <img src="/neo-offshore-platform.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,13,22,0.92),rgba(6,13,22,0.68))]" />
          <div className="relative flex items-center justify-between gap-6">
            <div>
              <p className="text-[12px] font-medium leading-4">Compromisso real<br />com quem faz acontecer.</p>
              <span className="mt-2 block h-px w-8 bg-[var(--admin-border-strong)]" />
            </div>
            <div className="text-right text-[18px] font-bold leading-none tracking-[0.12em]">GRAN<br /><span className="text-[8px] font-semibold tracking-[0.32em] text-white/70">SERVICES</span></div>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-[92rem] flex-wrap items-center justify-between gap-2 px-4 pb-3 text-[10.5px] text-[var(--admin-text-muted)] sm:px-8 lg:px-14">
        <span>Neo Jornada&nbsp;&nbsp; v1.0.0&nbsp;&nbsp; | &nbsp;&nbsp;Gran Services&nbsp;&nbsp; | &nbsp;&nbsp;2026</span>
        <span className="inline-flex items-center gap-3">A informação ao seu alcance. <span className="h-px w-8 bg-[var(--admin-border-strong)]" /></span>
      </footer>
    </main>
  );
}

function buildModuleCards(session: NonNullable<ReturnType<typeof useAuthSession>>): ModuleCard[] {
  const isAdmin = session.user.roles.includes('ADMIN');
  const applicationsByCode = new Map((session.applications ?? []).map((application) => [application.code, application]));
  const canShow = (code: ModuleApplicationCode) => code === 'NEO' ? isAdmin : isAdmin || applicationsByCode.has(code);

  const cards: ModuleCard[] = [
    {
      id: 'jornada',
      title: 'Jornada',
      description: 'Sua rotina, sob controle.',
      detail: 'Inbox, programação, vencimentos, comunicados e perfil.',
      category: 'jornada',
      icon: CalendarDays,
      applicationCode: 'JORNADA',
      to: '/inbox',
      tone: 'red',
      imageSrc: '/neo-app-jornada.png',
      enabled: canShow('JORNADA'),
      kind: 'PRODUCT',
    },
    {
      id: 'Tickets',
      title: 'Tickets',
      description: 'Atendimento operacional.',
      detail: 'Solicitações, filas, respostas e acompanhamento de suporte.',
      category: 'Tickets',
      icon: Headset,
      applicationCode: 'TICKETS',
      to: '/atendimentos',
      tone: 'dark',
      imageSrc: '/neo-app-tickets.png',
      enabled: canShow('TICKETS'),
      kind: 'PRODUCT',
    },
    {
      id: 'quickforms',
      title: 'QuickForms',
      description: 'Formulários e respostas.',
      detail: 'Biblioteca, fontes de opção, criação e gestão de formulários.',
      category: 'quickforms',
      icon: FileText,
      applicationCode: 'QUICK_FORMS',
      to: '/formularios',
      tone: 'amber',
      imageSrc: '/neo-app-quick-forms.png',
      enabled: canShow('QUICK_FORMS'),
      kind: 'PRODUCT',
    },
    {
      id: 'neo',
      title: 'Neo',
      description: 'Administração da plataforma.',
      detail: 'Usuários, módulos, acessos e configurações globais.',
      category: 'neo',
      icon: Settings,
      applicationCode: 'NEO',
      to: '/administracao',
      tone: 'neutral',
      enabled: canShow('NEO'),
      kind: 'PLATFORM',
    },
  ];

  return cards.filter((module) => module.enabled);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'NJ';
}

function moduleToneClass(tone: ModuleCard['tone']) {
  if (tone === 'red') {
    return 'border-[rgba(155,31,46,0.22)] bg-[var(--admin-border-strong)]';
  }

  if (tone === 'amber') {
    return 'border-[var(--admin-warning-border)] bg-[var(--admin-warning-text)]';
  }

  if (tone === 'neutral') {
    return 'border-[var(--admin-border)] bg-[#3a4654]';
  }

  return 'border-[var(--admin-border)] bg-[#182331]';
}

function ModuleIllustration({ tone }: { tone: ModuleCard['tone'] }) {
  const barClass = tone === 'neutral'
    ? 'from-[#3a4654] to-[#d7dee6]'
    : tone === 'amber'
      ? 'from-[#e1a23a] to-[#fff0cb]'
      : tone === 'red'
        ? 'from-[#9f2635] to-[#f3d3d8]'
        : 'from-[#3a4654] to-[#eef3f6]';

  return (
    <div className="relative h-full w-full">
      <div className="absolute right-3 top-5 h-[5.7rem] w-[7.8rem] rounded-[14px] border border-[#d9e0e5] bg-white/74 shadow-[0_18px_34px_rgba(15,23,42,0.12)]" />
      <div className="absolute right-9 top-9 flex h-16 items-end gap-2">
        {[38, 58, 78, 48].map((height) => (
          <span key={height} className={cn('w-4 rounded-t-[5px] bg-gradient-to-t', barClass)} style={{ height: `${height}%` }} />
        ))}
      </div>
    </div>
  );
}
