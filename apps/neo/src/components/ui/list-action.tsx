import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';

type ListActionProps = {
  label: string;
  to?: string;
  onClick?: () => void;
  className?: string;
};

const listActionClass =
  'col-span-2 inline-flex h-8 w-full min-w-0 items-center justify-center gap-1 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-1.5 text-[8px] font-semibold leading-none tracking-normal text-[var(--admin-text-secondary)] transition hover:bg-[var(--admin-panel-active)] hover:text-[var(--admin-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-strong)] sm:col-span-1 sm:col-start-auto sm:h-7 sm:w-[112px]';

export function ListAction({ label, to, onClick, className }: ListActionProps) {
  const content = (
    <>
      <span className="truncate">{label}</span>
      <ArrowRight size={11} className="shrink-0" />
    </>
  );

  if (to) {
    return (
      <Link to={to} className={cn(listActionClass, className)}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={cn(listActionClass, className)}>
      {content}
    </button>
  );
}
