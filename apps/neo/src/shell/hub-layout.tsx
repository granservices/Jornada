import { LogOut } from 'lucide-react';
import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { SearchField } from '../components/ui/search-field';
import { clearAuthSession } from '../features/auth/auth-session';
import { ThemeToggleButton } from '../features/theme/theme-toggle-button';
import { useAuthSession } from '../features/auth/use-auth-session';

export function HubLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const session = useAuthSession();
  const isApplicationsHub = location.pathname === '/aplicativos';
  const searchTerm = searchParams.get('q') ?? '';

  function logout() {
    clearAuthSession();
    void navigate('/login', { replace: true });
  }

  function updateSearch(value: string) {
    const nextSearchParams = new URLSearchParams(searchParams);

    if (value.trim()) {
      nextSearchParams.set('q', value);
    } else {
      nextSearchParams.delete('q');
    }

    setSearchParams(nextSearchParams, { replace: true });
  }

  if (isApplicationsHub) {
    return (
      <main className="neo-hub-shell min-h-screen text-[var(--admin-text-primary)]">
        {session ? <Outlet /> : null}
      </main>
    );
  }

  return (
    <main className="neo-hub-shell min-h-screen px-4 py-4 text-[var(--admin-text-primary)] sm:px-6 sm:py-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col sm:min-h-[calc(100vh-3rem)]">
        <header className="grid gap-3 border-b border-[var(--admin-border)] pb-3 sm:grid-cols-[minmax(0,1fr)_minmax(220px,360px)_minmax(0,1fr)] sm:items-center">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--admin-text-muted)]">
              GranServices
            </p>
            <p className="mt-0.5 text-[21px] font-semibold leading-none">
              <span>Neo</span>
              <span className="ml-2 text-[12px] font-medium text-[var(--admin-text-secondary)]">
                Aplicativos
              </span>
            </p>
          </div>
          {isApplicationsHub ? (
            <SearchField
              aria-label="Buscar aplicativos"
              value={searchTerm}
              onChange={updateSearch}
              placeholder="Buscar aplicativos"
              appearance="compact"
              className="h-10 w-full justify-self-center border-[var(--admin-border-strong)] bg-[var(--admin-surface-1)] px-3 shadow-[var(--admin-shadow)]"
              inputClassName="text-[12px]"
            />
          ) : <div aria-hidden="true" />}
          <div className="flex items-center gap-1.5 justify-self-start sm:justify-self-end">
            <ThemeToggleButton />
            <Button
              aria-label="Sair"
              variant="ghost"
              onPress={logout}
              className="h-8 min-h-8 w-8 p-0"
            >
              <LogOut size={16} aria-hidden="true" />
            </Button>
          </div>
        </header>
        <div className="flex min-h-0 flex-1 items-start py-4 sm:py-6">
          <div className="w-full">
            {session ? <Outlet /> : null}
          </div>
        </div>
      </div>
    </main>
  );
}
