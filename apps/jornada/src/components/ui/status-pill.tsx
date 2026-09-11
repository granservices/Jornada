import { cn } from '../../lib/cn';

type StatusTone = 'neutral' | 'warning' | 'critical';

const toneClasses: Record<StatusTone, string> = {
  neutral:
    'bg-[var(--admin-surface-3)] text-[var(--admin-text-secondary)] ring-[var(--admin-border)]',
  warning:
    'bg-[var(--admin-warning-bg)] text-[var(--admin-warning-text)] ring-[var(--admin-warning-border)]',
  critical:
    'bg-[var(--admin-danger-bg)] text-[var(--admin-danger-text)] ring-[var(--admin-danger-border)]',
};

export function StatusPill({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: StatusTone;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-6 min-w-[52px] items-center justify-center rounded-full px-1.5 text-[9.5px] font-semibold leading-none ring-1',
        toneClasses[tone],
      )}
    >
      <span className="truncate">{label}</span>
    </span>
  );
}
