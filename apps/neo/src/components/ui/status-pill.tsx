import { cn } from '../../lib/cn';

type StatusTone = 'neutral' | 'warning' | 'critical';

const toneClasses: Record<StatusTone, string> = {
  neutral:
    'bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)] ring-[var(--status-neutral-border)]',
  warning:
    'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] ring-[var(--status-warning-border)]',
  critical:
    'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] ring-[var(--status-danger-border)]',
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
        'inline-flex h-[20px] min-w-[52px] items-center justify-center rounded-[3px] px-2 text-[9px] font-bold leading-none ring-1',
        toneClasses[tone],
      )}
    >
      <span className="truncate">{label}</span>
    </span>
  );
}
