import { useEffect, type ReactElement } from 'react';
import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom';
import { AppShellLayout } from '@jornada/frontend-core/app-shell';
import {
  centralLoginHref,
  hasApplicationAccess,
  SsoTicketPage as SharedSsoTicketPage,
  useAuthSession,
} from '@jornada/frontend-core/auth';

type QuickFormsSession = NonNullable<ReturnType<typeof useAuthSession>>;

function canUseQuickForms(session: QuickFormsSession) {
  return hasApplicationAccess(session.applications, 'QUICK_FORMS');
}

function RootRedirect() {
  const session = useAuthSession();

  if (!session) {
    return <RedirectToCentralLogin />;
  }

  return (
    <Navigate
      to={canUseQuickForms(session) ? '/formularios' : '/sem-acesso'}
      replace
    />
  );
}

function RequireQuickFormsAccess({ children }: { children: ReactElement }) {
  const session = useAuthSession();

  if (!session) {
    return <RedirectToCentralLogin />;
  }

  return canUseQuickForms(session) ? children : <Navigate to="/sem-acesso" replace />;
}

function RedirectToCentralLogin() {
  const location = useLocation();

  useEffect(() => {
    const entryPath =
      location.pathname === '/' || location.pathname === '/login'
        ? '/formularios'
        : `${location.pathname}${location.search}${location.hash}`;

    window.location.replace(
      centralLoginHref({ code: 'QUICK_FORMS', entryPath }),
    );
  }, [location.hash, location.pathname, location.search]);

  return <main className="grid min-h-full place-items-center p-4 text-[var(--admin-text-secondary)]" />;
}

export function SsoTicketPage() {
  return (
    <SharedSsoTicketPage
      applicationName="QuickForms"
      defaultReturnTo="/formularios"
    />
  );
}

function NoQuickFormsAccessPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--admin-canvas)] px-4 text-[var(--admin-text-primary)]">
      <section className="w-full max-w-md rounded-[6px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-5 shadow-[var(--admin-shadow)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--admin-text-muted)]">
          QuickForms
        </p>
        <h1 className="mt-2 text-[20px] font-semibold">Acesso indisponivel</h1>
        <p className="mt-2 text-[13px] leading-5 text-[var(--admin-text-secondary)]">
          Seu usuario nao possui acesso ativo ao QuickForms.
        </p>
      </section>
    </main>
  );
}

export const router = createBrowserRouter([
  { path: '/', element: <RootRedirect /> },
  { path: '/login', element: <RedirectToCentralLogin /> },
  { path: '/sso', element: <SsoTicketPage /> },
  { path: '/sem-acesso', element: <NoQuickFormsAccessPage /> },
  {
    element: (
      <RequireQuickFormsAccess>
        <AppShellLayout experience="quick-forms" />
      </RequireQuickFormsAccess>
    ),
    children: [
      {
        path: '/formularios',
        lazy: async () => {
          const { FormsPage } = await import('./views/forms-page');
          return { Component: FormsPage };
        },
      },
      {
        path: '/formularios/fontes',
        lazy: async () => {
          const { OptionSourcesPage } = await import('./views/option-sources-page');
          return { Component: OptionSourcesPage };
        },
      },
      {
        path: '/formularios/novo',
        lazy: async () => {
          const { FormBuilderPage } = await import('./views/form-builder-page');
          return { Component: FormBuilderPage };
        },
      },
      {
        path: '/formularios/:formKey/editar',
        lazy: async () => {
          const { FormBuilderPage } = await import('./views/form-builder-page');
          return { Component: FormBuilderPage };
        },
      },
    ],
  },
]);
