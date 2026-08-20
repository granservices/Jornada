import { type PropsWithChildren } from 'react';
import { cn } from '../../lib/cn';

type SectionCardProps = PropsWithChildren<{
  className?: string;
}>;

export function SectionCard({ children, className }: SectionCardProps) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-[var(--border-soft)] bg-[color:var(--surface-frosted)] p-4 shadow-[0_20px_50px_-28px_rgba(15,23,42,0.28)] backdrop-blur-xl sm:p-5',
        className,
      )}
    >
      {children}
    </section>
  );
}
