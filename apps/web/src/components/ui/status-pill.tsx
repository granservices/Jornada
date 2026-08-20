import { cn } from '../../lib/cn';

type StatusTone = 'neutral' | 'warning' | 'critical';

const toneClasses: Record<StatusTone, string> = {
  neutral:
    'bg-[rgba(107,114,128,0.14)] text-[var(--text-secondary)] ring-[rgba(107,114,128,0.18)]',
  warning:
    'bg-[rgba(217,119,6,0.12)] text-[var(--warning-700)] ring-[rgba(217,119,6,0.18)]',
  critical:
    'bg-[rgba(199,53,44,0.12)] text-[var(--danger-700)] ring-[rgba(199,53,44,0.18)]',
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
        'inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-medium ring-1',
        toneClasses[tone],
      )}
    >
      {label}
    </span>
  );
}
