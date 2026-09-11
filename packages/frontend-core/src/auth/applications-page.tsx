import { ClipboardList, Grid2x2, MoveRight, ShieldCheck, TicketCheck } from 'lucide-react';
import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { SectionCard } from '../ui/section-card';
import { useAuthSession } from './use-auth-session';
import { defaultRouteForAuthenticatedUser } from './auth-routing';
import { applicationEntryHref, isExternalHref } from './application-entry';
import { requestApplicationSsoHref } from './sso-api';

const appIcons = {
  JORNADA: Grid2x2,
  HELP_HUB: TicketCheck,
  QUICK_FORMS: ClipboardList,
} as const;

export function ApplicationsPage({
  alwaysShowCatalog = false,
}: {
  alwaysShowCatalog?: boolean;
}) {
  const session = useAuthSession();
  const applications = session?.applications ?? [];
  const [launchingCode, setLaunchingCode] = useState<string | null>(null);

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

  return (
    <main className="grid h-full min-h-0 w-full gap-2">
      <SectionCard className="p-4 sm:p-5">
        <div className="flex items-center gap-2 text-[var(--admin-text-secondary)]">
          <ShieldCheck size={15} />
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">
            Acesso central
          </span>
        </div>
        <h1 className="mt-3 text-[20px] font-semibold text-[var(--admin-text-primary)]">
          Escolha o aplicativo
        </h1>
        <p className="mt-1 text-[13px] text-[var(--admin-text-secondary)]">
          Cada acesso respeita o papel que voce tem dentro daquele contexto.
        </p>
      </SectionCard>

      <div className="grid gap-2 lg:grid-cols-2">
        {applications.map((application) => {
          const Icon =
            appIcons[application.code as keyof typeof appIcons] ?? Grid2x2;
          const href = applicationEntryHref(application);
          const content = (
            <SectionCard className="group h-full p-4 transition hover:border-[var(--admin-border-strong)] hover:bg-[var(--admin-surface-2)]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[5px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[var(--admin-text-primary)]">
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-[15px] font-semibold text-[var(--admin-text-primary)]">
                        {application.name}
                      </h2>
                      {application.isDefault ? (
                        <span className="rounded-[3px] border border-[var(--admin-border)] bg-[var(--admin-panel-active)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-primary)]">
                          Padrao
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[12px] text-[var(--admin-text-secondary)]">
                      {application.description ?? 'Aplicativo disponivel no seu perfil.'}
                    </p>
                    <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-muted)]">
                      Papeis: {application.roles.join(', ').toLowerCase()}
                    </p>
                  </div>
                </div>
                <MoveRight
                  size={16}
                  className="mt-1 shrink-0 text-[var(--admin-text-secondary)] transition group-hover:text-[var(--admin-text-primary)]"
                />
              </div>
            </SectionCard>
          );

          return isExternalHref(href) ? (
            <button
              key={application.code}
              type="button"
              className="block w-full text-left disabled:cursor-wait disabled:opacity-60"
              disabled={launchingCode !== null}
              onClick={async () => {
                setLaunchingCode(application.code);

                try {
                  const ssoHref = await requestApplicationSsoHref(application);
                  window.location.assign(ssoHref);
                } finally {
                  setLaunchingCode(null);
                }
              }}
            >
              {content}
            </button>
          ) : (
            <Link key={application.code} to={href} className="block">
              {content}
            </Link>
          );
        })}
      </div>
    </main>
  );
}
