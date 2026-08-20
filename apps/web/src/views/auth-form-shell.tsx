import type { ReactNode } from 'react';
import { Form } from 'react-aria-components';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Button } from '../components/ui/button';
import { SectionCard } from '../components/ui/section-card';

type AuthFormShellProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  submitLabel: string;
  children: ReactNode;
  footerText?: string;
  footerActionLabel?: string;
  footerActionTo?: string;
  compact?: boolean;
};

export function AuthFormShell({
  eyebrow,
  title,
  description,
  submitLabel,
  children,
  footerText,
  footerActionLabel,
  footerActionTo,
  compact = false,
}: AuthFormShellProps) {
  return (
    <SectionCard
      className={compact ? 'rounded-[32px] p-5 sm:p-7' : 'rounded-[28px] p-5 sm:p-7'}
    >
      {!compact && (eyebrow || title || description) ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
          className="space-y-2"
        >
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--brand-700)]">
              {eyebrow}
            </p>
          ) : null}
          {title ? (
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
              {title}
            </h2>
          ) : null}
          {description ? (
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              {description}
            </p>
          ) : null}
        </motion.div>
      ) : null}
      <Form className="mt-6 space-y-4">
        {children}
        <Button type="submit" className="w-full">
          {submitLabel}
        </Button>
      </Form>
      {footerText && footerActionLabel && footerActionTo ? (
        <p className="mt-5 text-center text-sm text-[var(--text-muted)]">
          {footerText}{' '}
          <Link
            to={footerActionTo}
            className="font-medium text-[var(--brand-700)] transition hover:text-[var(--brand-800)]"
          >
            {footerActionLabel}
          </Link>
        </p>
      ) : null}
    </SectionCard>
  );
}
