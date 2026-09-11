import { AppWindow, ArrowUpRight, FileText, Headset, Route } from 'lucide-react';
import { type CSSProperties } from 'react';
import { GridList, GridListItem } from 'react-aria-components/GridList';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { defaultRouteForAuthenticatedUser } from '../features/auth/auth-routing';
import {
  applicationEntryHref,
  isExternalHref,
} from '../features/auth/application-entry';
import { useAuthSession } from '../features/auth/use-auth-session';
import { cn } from '../lib/cn';

const appDetails = {
  JORNADA: {
    accent: '#f16358',
    tint: 'rgba(241, 99, 88, 0.22)',
    icon: Route,
    imageSrc: '/neo-app-jornada.png',
  },
  HELP_HUB: {
    accent: '#58c6a2',
    tint: 'rgba(88, 198, 162, 0.2)',
    icon: Headset,
    imageSrc: '/neo-app-help-hub.png',
  },
  QUICK_FORMS: {
    accent: '#e3a44b',
    tint: 'rgba(227, 164, 75, 0.22)',
    icon: FileText,
    imageSrc: '/neo-app-quick-forms.png',
  },
} as const;

export function ApplicationsPage({
  alwaysShowCatalog = false,
}: {
  alwaysShowCatalog?: boolean;
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const session = useAuthSession();
  const applications = session?.applications ?? [];
  const searchTerm = searchParams.get('q') ?? '';
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('pt-BR');
  const filteredApplications = applications.filter((application) =>
    `${application.name} ${application.description ?? ''}`
      .toLocaleLowerCase('pt-BR')
      .includes(normalizedSearch),
  );

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

  async function launchApplication(application: (typeof applications)[number]) {
    const href = applicationEntryHref(application);

    if (!isExternalHref(href)) {
      navigate(href);
      return;
    }

    window.location.assign(href);
  }

  return (
    <main className="w-full">
      <GridList
        aria-label="Aplicativos disponiveis"
        items={filteredApplications}
        layout="grid"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
      >
        {(application) => {
          const detail = appDetails[application.code as keyof typeof appDetails];
          const accent = detail?.accent ?? '#a3a9b1';
          const tint = detail?.tint ?? 'rgba(163, 169, 177, 0.16)';
          const imageSrc = application.imageUrl ?? detail?.imageSrc;
          const Icon = detail?.icon ?? AppWindow;
          const entryLabel = application.entryKind === 'REDIRECT' ? 'Link' : 'App';
          return (
            <GridListItem
              id={application.code}
              textValue={application.name}
              onAction={() => void launchApplication(application)}
              style={
                {
                  '--application-accent': accent,
                  '--application-tint': tint,
                } as CSSProperties
              }
              className={({ isFocusVisible, isHovered, isPressed }) =>
                cn(
                  'group relative isolate min-h-[17rem] overflow-visible rounded-[3px] border border-[var(--admin-border)] bg-[rgba(9,10,12,0.46)] text-left shadow-[var(--admin-shadow)] outline-none transition duration-200',
                  isHovered && 'z-10 border-[var(--admin-border-strong)]',
                  isPressed && 'translate-y-px',
                  isFocusVisible &&
                    'z-10 border-[var(--admin-border-strong)] ring-2 ring-[var(--admin-accent-border)] ring-offset-2 ring-offset-[var(--admin-canvas)]',
                )
              }
            >
              <div className="neo-application-media-surface absolute inset-0 rounded-[3px]" />
              <div className="absolute inset-0 rounded-[3px] bg-[linear-gradient(140deg,var(--application-tint)_0%,transparent_58%)]" />
              <div className="pointer-events-none absolute inset-x-2 top-2 bottom-[5.5rem] z-30 flex items-center justify-center">
                {imageSrc ? (
                  <img
                    src={imageSrc}
                    alt=""
                    className="h-full w-full origin-bottom scale-[1.05] object-contain opacity-95 drop-shadow-[0_16px_18px_rgba(0,0,0,0.32)] transition duration-500 motion-reduce:transition-none group-data-[hovered]:translate-y-1 group-data-[hovered]:scale-[1.176] group-data-[hovered]:drop-shadow-[0_24px_26px_rgba(0,0,0,0.46)]"
                  />
                ) : (
                  <AppWindow
                    size={64}
                    strokeWidth={1.25}
                    aria-hidden="true"
                    className="text-[var(--application-accent)] opacity-85 drop-shadow-[0_16px_18px_rgba(0,0,0,0.32)]"
                  />
                )}
              </div>
              <div className="absolute inset-x-0 top-0 z-20 h-px bg-[var(--application-accent)]" />
              <Icon
                size={19}
                strokeWidth={1.8}
                aria-hidden="true"
                className="pointer-events-none absolute right-4 top-4 z-30 text-[var(--application-accent)] drop-shadow-[0_4px_8px_rgba(0,0,0,0.45)]"
              />

              <div className="absolute inset-x-0 bottom-0 z-20 flex min-h-[5.5rem] items-end rounded-b-[3px] border-t border-white/10 bg-[rgba(7,8,10,0.76)] px-4 py-3.5 text-white backdrop-blur-[3px]">
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <h2 className="truncate text-[17px] font-semibold">
                        {application.name}
                      </h2>
                      <span className="shrink-0 rounded-full border border-white/15 bg-black/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-white/72">
                        {entryLabel}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[12px] leading-5 opacity-80">
                      {application.description ?? 'Aplicativo disponivel no seu perfil.'}
                    </p>
                  </div>
                  <ArrowUpRight
                    size={19}
                    aria-hidden="true"
                    className="mb-1 shrink-0 text-[var(--application-accent)] transition duration-200 group-data-[hovered]:text-white"
                  />
                </div>
              </div>
            </GridListItem>
          );
        }}
      </GridList>
      {filteredApplications.length === 0 ? (
        <p className="mt-6 text-center text-sm text-[var(--admin-text-secondary)]">
          Nenhum aplicativo encontrado.
        </p>
      ) : null}
    </main>
  );
}
