import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { consumeSsoTicket } from './auth-api';
import { persistAuthSession } from './auth-session';

type SsoTicketPageProps = {
  applicationName: string;
  defaultReturnTo: string;
};

export function SsoTicketPage({
  applicationName,
  defaultReturnTo,
}: SsoTicketPageProps) {
  const location = useLocation();
  const [state, setState] = useState<
    | { kind: 'loading' }
    | { kind: 'error'; message: string }
    | { kind: 'complete'; returnTo: string }
  >({ kind: 'loading' });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ticket = params.get('ticket');
    const returnTo = safeReturnTo(params.get('returnTo'), defaultReturnTo);

    if (!ticket) {
      setState({ kind: 'error', message: 'Codigo de acesso ausente.' });
      return;
    }

    let cancelled = false;
    void consumeSsoTicket(ticket)
      .then((session) => {
        if (!cancelled) {
          persistAuthSession(session);
          setState({ kind: 'complete', returnTo });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            kind: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'Nao foi possivel validar o acesso.',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [defaultReturnTo, location.search]);

  if (state.kind === 'complete') {
    return <Navigate to={state.returnTo} replace />;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--admin-canvas)] px-4 text-[var(--admin-text-primary)]">
      <p className="text-[13px] text-[var(--admin-text-secondary)]">
        {state.kind === 'error'
          ? state.message
          : `Validando acesso ao ${applicationName}...`}
      </p>
    </main>
  );
}

function safeReturnTo(value: string | null, defaultReturnTo: string) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return defaultReturnTo;
  }

  return value;
}
