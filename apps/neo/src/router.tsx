import type { ReactElement } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom';
import { AppShellLayout } from './shell/app-shell-layout';
import { AuthLayout } from './shell/auth-layout';
import { HubLayout } from './shell/hub-layout';
import { useAuthSession } from './features/auth/use-auth-session';
import {
  defaultRouteForAuthenticatedUser,
  hasApplicationAccess,
  isSupportOperatorUser,
} from './features/auth/auth-routing';
import { NeoMiraiLoginPage } from './views/neo-mirai-login-page';
import {
  clearCentralLoginIntent,
  parseCentralLoginIntent,
  persistCentralLoginIntent,
  type CentralLoginIntent,
} from './features/auth/central-login-intent';

function RootRedirect() {
  const session = useAuthSession();

  return (
    <Navigate
      to={
        session
          ? defaultRouteForAuthenticatedUser(session.user, session.applications)
          : '/login'
      }
      replace
    />
  );
}

function RedirectIfAuthenticated({ children }: { children: ReactElement }) {
  const session = useAuthSession();
  const location = useLocation();

  if (session && location.pathname !== '/login') {
    return (
      <Navigate
        to={defaultRouteForAuthenticatedUser(session.user, session.applications)}
        replace
      />
    );
  }

  return children;
}

function canOpenApplication(
  session: NonNullable<ReturnType<typeof useAuthSession>>,
  applicationCode: CentralLoginIntent['applicationCode'],
) {
  return (
    hasApplicationAccess(session.applications, applicationCode) ||
    (applicationCode === 'TICKETS' && isSupportOperatorUser(session.user))
  );
}

function CentralLoginPage() {
  const location = useLocation();
  const intentRef = useRef(parseCentralLoginIntent(location.search));
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    persistCentralLoginIntent(intentRef.current);
    setIsReady(true);
  }, []);

  const getRedirectTo = useCallback(
    (session: NonNullable<ReturnType<typeof useAuthSession>>) => {
      const intent = intentRef.current;

      if (intent && canOpenApplication(session, intent.applicationCode)) {
        clearCentralLoginIntent();
        return intent.entryPath;
      }

      return defaultRouteForAuthenticatedUser(session.user, session.applications);
    },
    [],
  );

  if (!isReady) {
    return <main className="grid min-h-full place-items-center p-4 text-[var(--admin-text-secondary)]" />;
  }

  return <NeoMiraiLoginPage getRedirectTo={getRedirectTo} />;
}

function RequireAuth({ children }: { children: ReactElement }) {
  const session = useAuthSession();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function RequireApplicationAccess({
  applicationCode,
  children,
}: {
  applicationCode: 'JORNADA' | 'TICKETS' | 'QUICK_FORMS';
  children: ReactElement;
}) {
  const session = useAuthSession();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (hasApplicationAccess(session.applications, applicationCode)) {
    return children;
  }

  if (
    applicationCode === 'TICKETS' &&
    isSupportOperatorUser(session.user)
  ) {
    return children;
  }

  return (
    <Navigate
      to={defaultRouteForAuthenticatedUser(session.user, session.applications)}
      replace
    />
  );
}

function RequireGlobalAdmin({ children }: { children: ReactElement }) {
  const session = useAuthSession();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!session.user.roles.includes('ADMIN')) {
    return (
      <Navigate
        to={defaultRouteForAuthenticatedUser(session.user, session.applications)}
        replace
      />
    );
  }

  return children;
}

export const routeDefinitions = [
  {
    path: '/',
    element: <RootRedirect />,
  },
  {
    path: '/login/neo-mirai',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: (
      <RedirectIfAuthenticated>
        <CentralLoginPage />
      </RedirectIfAuthenticated>
    ),
  },
  {
    path: '/convite',
    lazy: async () => {
      const { AcceptInvitationPage } = await import('./views/accept-invitation-page');
      return { Component: AcceptInvitationPage };
    },
  },
  {
    element: (
      <RedirectIfAuthenticated>
        <AuthLayout />
      </RedirectIfAuthenticated>
    ),
    children: [
      {
        path: '/register',
        element: <Navigate to="/login" replace />,
      },
      {
        path: '/forgot-password',
        lazy: async () => {
          const { ForgotPasswordPage } = await import('./views/forgot-password-page');
          return { Component: ForgotPasswordPage };
        },
      },
      {
        path: '/reset-password',
        lazy: async () => {
          const { ResetPasswordPage } = await import('./views/reset-password-page');
          return { Component: ResetPasswordPage };
        },
      },
    ],
  },
  {
    element: (
      <RequireAuth>
        <HubLayout />
      </RequireAuth>
    ),
    children: [
      {
        path: '/aplicativos',
        lazy: async () => {
          const { ApplicationsPage } = await import('./views/applications-page');
          return { Component: ApplicationsPage };
        },
      },
    ],
  },
  {
    element: (
      <RequireApplicationAccess applicationCode="TICKETS">
        <AppShellLayout experience="atendimento" />
      </RequireApplicationAccess>
    ),
    children: [
      {
        path: '/atendimentos',
        lazy: async () => {
          const { SupportPage } = await import('./modules/tickets/support-page');
          return { Component: SupportPage };
        },
      },
      {
        path: '/atendimentos/aprovacoes',
        lazy: async () => {
          const { SupportApprovalsPage } = await import('./modules/tickets/support-approvals-page');
          return { Component: SupportApprovalsPage };
        },
      },
      {
        path: '/atendimentos/configuracao',
        lazy: async () => {
          const { SupportCatalogAdminPage } = await import('./modules/tickets/support-catalog-admin-page');
          return { Component: SupportCatalogAdminPage };
        },
      },
      {
        path: '/atendimentos/configuracao/setores',
        lazy: async () => {
          const { SupportDepartmentsAdminPage } = await import('./modules/tickets/support-catalog-admin-page');
          return { Component: SupportDepartmentsAdminPage };
        },
      },
      {
        path: '/atendimentos/configuracao/assuntos',
        lazy: async () => {
          const { SupportTopicsAdminPage } = await import('./modules/tickets/support-catalog-admin-page');
          return { Component: SupportTopicsAdminPage };
        },
      },
      {
        path: '/atendimentos/configuracao/equipes',
        lazy: async () => {
          const { SupportTeamsAdminPage } = await import('./modules/tickets/support-catalog-admin-page');
          return { Component: SupportTeamsAdminPage };
        },
      },
      {
        path: '/atendimentos/configuracao/regras',
        lazy: async () => {
          const { SupportRoutingRulesAdminPage } = await import('./modules/tickets/support-catalog-admin-page');
          return { Component: SupportRoutingRulesAdminPage };
        },
      },
      {
        path: '/atendimentos/configuracao/aprovacoes',
        lazy: async () => {
          const { SupportApprovalRulesAdminPage } = await import('./modules/tickets/support-approval-rules-admin-page');
          return { Component: SupportApprovalRulesAdminPage };
        },
      },
      {
        path: '/atendimentos/configuracao/formularios',
        element: <Navigate to="/formularios" replace />,
      },
    ],
  },
  {
    element: (
      <RequireApplicationAccess applicationCode="QUICK_FORMS">
        <AppShellLayout experience="quick-forms" />
      </RequireApplicationAccess>
    ),
    children: [
      {
        path: '/formularios',
        lazy: async () => {
          const { FormsPage } = await import('./modules/quick-forms/forms-page');
          return { Component: FormsPage };
        },
      },
      {
        path: '/formularios/fontes',
        lazy: async () => {
          const { OptionSourcesPage } = await import('./modules/quick-forms/option-sources-page');
          return { Component: OptionSourcesPage };
        },
      },
      {
        path: '/formularios/novo',
        lazy: async () => {
          const { FormBuilderPage } = await import('./modules/quick-forms/form-builder-page');
          return { Component: FormBuilderPage };
        },
      },
      {
        path: '/formularios/:formKey/editar',
        lazy: async () => {
          const { FormBuilderPage } = await import('./modules/quick-forms/form-builder-page');
          return { Component: FormBuilderPage };
        },
      },
    ],
  },
  {
    element: (
      <RequireGlobalAdmin>
        <AppShellLayout experience="administracao" />
      </RequireGlobalAdmin>
    ),
    children: [
      {
        path: '/administracao',
        lazy: async () => {
          const { NeoAdministrationPage } = await import('./views/neo-administration-page');
          return { Component: NeoAdministrationPage };
        },
      },
      {
        path: '/administracao/aplicativos',
        lazy: async () => {
          const { ApplicationCatalogAdminPage } = await import(
            './views/application-catalog-admin-page'
          );
          return { Component: ApplicationCatalogAdminPage };
        },
      },
      {
        path: '/administracao/usuarios',
        lazy: async () => {
          const { UserAccessManagementPage } = await import(
            './views/user-access-management-page'
          );
          return { Component: UserAccessManagementPage };
        },
      },
    ],
  },
  {
    element: (
      <RequireAuth>
        <AppShellLayout />
      </RequireAuth>
    ),
    children: [
      {
        path: '/inbox',
        lazy: async () => {
          const { InboxPage } = await import('./views/dashboard-page');
          return {
            Component: () => (
              <RequireApplicationAccess applicationCode="JORNADA">
                <InboxPage />
              </RequireApplicationAccess>
            ),
          };
        },
      },
      {
        path: '/programacao',
        lazy: async () => {
          const { ProgramacaoPage } = await import('./views/dashboard-page');
          return {
            Component: () => (
              <RequireApplicationAccess applicationCode="JORNADA">
                <ProgramacaoPage />
              </RequireApplicationAccess>
            ),
          };
        },
      },
      {
        path: '/comunicados',
        lazy: async () => {
          const { CommunicationsPage } = await import('./views/communications-page');
          return {
            Component: () => (
              <RequireApplicationAccess applicationCode="JORNADA">
                <CommunicationsPage />
              </RequireApplicationAccess>
            ),
          };
        },
      },
      {
        path: '/agenda',
        element: <Navigate to="/programacao" replace />,
      },
      {
        path: '/vencimentos',
        lazy: async () => {
          const { ExpirationsPage } = await import('./views/expirations-page');
          return {
            Component: () => (
              <RequireApplicationAccess applicationCode="JORNADA">
                <ExpirationsPage />
              </RequireApplicationAccess>
            ),
          };
        },
      },
      {
        path: '/atendimento',
        lazy: async () => {
          const { SupportContactPage } = await import('./views/support-contact-page');
          return {
            Component: () => (
              <RequireApplicationAccess applicationCode="JORNADA">
                <SupportContactPage />
              </RequireApplicationAccess>
            ),
          };
        },
      },
      {
        path: '/chat',
        element: <Navigate to="/atendimento" replace />,
      },
      {
        path: '/perfil',
        lazy: async () => {
          const { ProfilePage } = await import('./views/dashboard-page');
          return {
            Component: () => (
              <RequireApplicationAccess applicationCode="JORNADA">
                <ProfilePage />
              </RequireApplicationAccess>
            ),
          };
        },
      },
    ],
  },
  {
    path: '/app',
    element: <Navigate to="/" replace />,
  },
];

export const router = createBrowserRouter(routeDefinitions);
