import { type PropsWithChildren } from 'react';
import { cn } from '../../lib/cn';

type SectionCardProps = PropsWithChildren<{
  className?: string;
}>;

export function SectionCard({ children, className }: SectionCardProps) {
  return (
    <section
      className={cn(
        'rounded-[3px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-4 text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)]',
        className,
      )}
    >
      {children}
    </section>
  );
}
