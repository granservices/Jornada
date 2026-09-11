import { useEffect, useState, type ReactElement } from 'react';
import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom';
import { AppShellLayout } from '@jornada/frontend-core/app-shell';
import {
  centralLoginHref,
  hasApplicationAccess,
  isSupportOperatorUser,
  requestApplicationSsoHref,
  SsoTicketPage as SharedSsoTicketPage,
  useAuthSession,
} from '@jornada/frontend-core/auth';
import { addSupportCaseMessage, getSupportCase } from './features/support/support-api';

const supportWorkspace = {
  addMessage: addSupportCaseMessage,
  getCase: getSupportCase,
};

function RootRedirect() {
  const session = useAuthSession();

  if (!session) {
    return <RedirectToCentralLogin />;
  }

  if (canUseHelpHub(session)) {
    return <Navigate to="/atendimentos?fila=nao-atribuidos" replace />;
  }

  return <Navigate to="/sem-acesso" replace />;
}

function RequireOpsAccess({ children }: { children: ReactElement }) {
  const session = useAuthSession();

  if (!session) {
    return <RedirectToCentralLogin />;
  }

  if (canUseHelpHub(session)) {
    return children;
  }

  return <Navigate to="/sem-acesso" replace />;
}

function RedirectToCentralLogin() {
  const location = useLocation();

  useEffect(() => {
    const entryPath =
      location.pathname === '/' || location.pathname === '/login'
        ? '/atendimentos?fila=nao-atribuidos'
        : `${location.pathname}${location.search}${location.hash}`;

    window.location.replace(
      centralLoginHref({ code: 'HELP_HUB', entryPath }),
    );
  }, [location.hash, location.pathname, location.search]);

  return <main className="grid min-h-full place-items-center p-4 text-[var(--admin-text-secondary)]" />;
}

function RedirectToQuickFormsApp() {
  const location = useLocation();
  const session = useAuthSession();
  const [redirectError, setRedirectError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;
    const entryPath = `${location.pathname}${location.search}${location.hash}`;

    void requestApplicationSsoHref({ code: 'QUICK_FORMS', entryPath })
      .then((target) => {
        if (!cancelled) {
          window.location.replace(target);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setRedirectError(
            error instanceof Error
              ? error.message
              : 'Nao foi possivel abrir o QuickForms.',
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [location.hash, location.pathname, location.search, session]);

  return (
    <main className="grid min-h-full place-items-center p-4 text-center text-[var(--admin-text-secondary)]">
      <p>{redirectError ?? 'Redirecionando para o QuickForms...'}</p>
    </main>
  );
}

function NoOpsAccessPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--admin-canvas)] px-4 text-[var(--admin-text-primary)]">
      <section className="w-full max-w-md rounded-[6px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-5 shadow-[var(--admin-shadow)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--admin-text-muted)]">
          HelpHub
        </p>
        <h1 className="mt-2 text-[20px] font-semibold">Acesso operacional indisponivel</h1>
        <p className="mt-2 text-[13px] leading-5 text-[var(--admin-text-secondary)]">
          Seu usuario nao possui acesso ativo ao aplicativo de atendimento.
        </p>
      </section>
    </main>
  );
}

export function SsoTicketPage() {
  return (
    <SharedSsoTicketPage
      applicationName="HelpHub"
      defaultReturnTo="/atendimentos?fila=nao-atribuidos"
    />
  );
}

type HelpHubSession = NonNullable<ReturnType<typeof useAuthSession>>;

function canUseHelpHub(session: HelpHubSession) {
  return (
    hasApplicationAccess(session.applications, 'HELP_HUB') ||
    isSupportOperatorUser(session.user)
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootRedirect />
  },
  { path: '/login', element: <RedirectToCentralLogin /> },
  {
    path: '/sso',
    element: <SsoTicketPage />
  },
  {
    path: '/sem-acesso',
    element: <NoOpsAccessPage />
  },
  {
    element: (
      <RequireOpsAccess>
        <AppShellLayout experience="atendimento" supportWorkspace={supportWorkspace} />
      </RequireOpsAccess>
    ),
    children: [
      {
        path: '/atendimentos',
        lazy: async () => {
          const { SupportPage } = await import('./views/support-page');
          return { Component: SupportPage };
        }
      },
      {
        path: '/atendimentos/configuracao',
        lazy: async () => {
          const { SupportCatalogAdminPage } = await import('./views/support-catalog-admin-page');
          return { Component: SupportCatalogAdminPage };
        }
      },
      {
        path: '/atendimentos/configuracao/setores',
        lazy: async () => {
          const { SupportDepartmentsAdminPage } = await import('./views/support-catalog-admin-page');
          return { Component: SupportDepartmentsAdminPage };
        }
      },
      {
        path: '/atendimentos/configuracao/assuntos',
        lazy: async () => {
          const { SupportTopicsAdminPage } = await import('./views/support-catalog-admin-page');
          return { Component: SupportTopicsAdminPage };
        }
      },
      {
        path: '/atendimentos/configuracao/equipes',
        lazy: async () => {
          const { SupportTeamsAdminPage } = await import('./views/support-catalog-admin-page');
          return { Component: SupportTeamsAdminPage };
        }
      },
      {
        path: '/atendimentos/configuracao/regras',
        lazy: async () => {
          const { SupportRoutingRulesAdminPage } = await import('./views/support-catalog-admin-page');
          return { Component: SupportRoutingRulesAdminPage };
        }
      },
      {
        path: '/atendimentos/configuracao/formularios',
        element: <RedirectToQuickFormsApp />
      },
      {
        path: '/formularios/*',
        element: <RedirectToQuickFormsApp />
      }
    ]
  }
]);
