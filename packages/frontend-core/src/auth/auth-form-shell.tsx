import type { FormEventHandler, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Button } from '../ui/button';
import { SectionCard } from '../ui/section-card';

type AuthFormShellProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  submitLabel: string;
  children: ReactNode;
  afterSubmit?: ReactNode;
  footerText?: string;
  footerActionLabel?: string;
  footerActionTo?: string;
  compact?: boolean;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  isSubmitting?: boolean;
  submitError?: string | null;
};

export function AuthFormShell({
  eyebrow,
  title,
  description,
  submitLabel,
  children,
  afterSubmit,
  footerText,
  footerActionLabel,
  footerActionTo,
  compact = false,
  onSubmit,
  isSubmitting = false,
  submitError,
}: AuthFormShellProps) {
  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    if (!onSubmit) {
      event.preventDefault();
      return;
    }

    onSubmit(event);
  };

  return (
    <SectionCard
      className="rounded-[5px] border-0 !bg-transparent px-8 py-9 !shadow-none !backdrop-blur-none sm:p-0"
    >
      {!compact && (eyebrow || title || description) ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
          className="relative space-y-2"
        >
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--brand-700)]">
              {eyebrow}
            </p>
          ) : null}
          {title ? (
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] sm:text-[1.75rem]">
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
      <form
        autoComplete="off"
        method="post"
        noValidate
        onSubmit={handleSubmit}
        className={compact ? 'relative space-y-4' : 'relative mt-6 space-y-4'}
      >
        {children}
        {submitError ? (
          <p className="text-sm text-[#fecaca]">{submitError}</p>
        ) : null}
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.62, delay: compact ? 1.56 : 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          <Button
            type="submit"
            isDisabled={isSubmitting}
            className="auth-submit-button w-full rounded-[6px] min-h-12"
          >
            {submitLabel}
          </Button>
        </motion.div>
        {afterSubmit ? <div className="pt-1">{afterSubmit}</div> : null}
      </form>
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
