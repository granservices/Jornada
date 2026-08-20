import type { ReactNode } from 'react';
import {
  Bell,
  CalendarRange,
  CircleHelp,
  ClipboardCheck,
  LayoutGrid,
} from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { BrandMark } from './brand-mark';
import { cn } from '../lib/cn';

const navigation = [
  { label: 'Início', icon: LayoutGrid, to: '/app' },
  { label: 'Agenda', icon: CalendarRange, to: '/app?tab=agenda' },
  { label: 'Vencimentos', icon: ClipboardCheck, to: '/app?tab=vencimentos' },
  { label: 'Avisos', icon: Bell, to: '/app?tab=avisos' },
  { label: 'Suporte', icon: CircleHelp, to: '/app?tab=suporte' },
];

export function AppShellLayout() {
  return (
    <div className="min-h-screen bg-[var(--surface-canvas)]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col lg:flex-row">
        <aside className="hidden w-72 shrink-0 border-r border-[var(--border-soft)] bg-[rgba(255,255,255,0.76)] px-5 py-6 backdrop-blur-xl lg:flex lg:flex-col">
          <BrandMark />
          <nav className="mt-8 flex flex-col gap-2">
            {navigation.map(({ label, icon: Icon, to }) => (
              <NavItem key={label} label={label} icon={<Icon size={18} />} to={to} />
            ))}
          </nav>
        </aside>
        <div className="flex min-h-screen flex-1 flex-col pb-20 lg:pb-0">
          <header className="sticky top-0 z-20 border-b border-[var(--border-soft)] bg-[rgba(243,245,247,0.86)] px-4 py-4 backdrop-blur-xl sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <BrandMark />
              <div className="min-w-0 text-right">
                <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                  Lucas Andrade
                </p>
                <p className="truncate text-xs text-[var(--text-muted)]">
                  Operações Offshore
                </p>
              </div>
            </div>
          </header>
          <div className="flex-1 px-4 py-4 sm:px-6 sm:py-6">
            <Outlet />
          </div>
        </div>
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border-soft)] bg-[rgba(255,255,255,0.86)] px-2 py-2 backdrop-blur-xl lg:hidden">
          <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
            {navigation.map(({ label, icon: Icon, to }) => (
              <NavLink
                key={label}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-medium transition',
                    isActive
                      ? 'bg-[rgba(199,53,44,0.10)] text-[var(--brand-700)]'
                      : 'text-[var(--text-muted)]',
                  )
                }
              >
                <Icon size={18} />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}

function NavItem({
  label,
  icon,
  to,
}: {
  label: string;
  icon: ReactNode;
  to: string;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition',
          isActive
            ? 'bg-[rgba(199,53,44,0.10)] text-[var(--brand-700)]'
            : 'text-[var(--text-secondary)] hover:bg-[rgba(109,118,128,0.08)]',
        )
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}
