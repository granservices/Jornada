import type { ReactNode } from 'react';
import { Form } from 'react-aria-components';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { SectionCard } from '../components/ui/section-card';

type AuthFormShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  submitLabel: string;
  children: ReactNode;
  footerText: string;
  footerActionLabel: string;
  footerActionTo: string;
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
}: AuthFormShellProps) {
  return (
    <SectionCard className="rounded-[28px] p-5 sm:p-7">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--brand-700)]">
          {eyebrow}
        </p>
        <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
          {title}
        </h2>
        <p className="text-sm leading-6 text-[var(--text-secondary)]">
          {description}
        </p>
      </div>
      <Form className="mt-6 space-y-4">
        {children}
        <Button type="submit" className="w-full">
          {submitLabel}
        </Button>
      </Form>
      <p className="mt-5 text-center text-sm text-[var(--text-muted)]">
        {footerText}{' '}
        <Link
          to={footerActionTo}
          className="font-medium text-[var(--brand-700)] transition hover:text-[var(--brand-800)]"
        >
          {footerActionLabel}
        </Link>
      </p>
    </SectionCard>
  );
}
