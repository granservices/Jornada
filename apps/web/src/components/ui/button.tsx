import {
  Button as AriaButton,
  type ButtonProps as AriaButtonProps,
} from 'react-aria-components';
import { cn } from '../../lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

type ButtonProps = AriaButtonProps & {
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--brand-600)] text-white shadow-sm shadow-[var(--brand-shadow)] hover:bg-[var(--brand-700)] pressed:bg-[var(--brand-800)]',
  secondary:
    'bg-[var(--surface-panel-strong)] text-[var(--text-primary)] ring-1 ring-[var(--border-soft)] hover:bg-[var(--surface-panel)] pressed:bg-[var(--surface-muted)]',
  ghost:
    'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-panel)] pressed:bg-[var(--surface-muted)]',
};

export function Button({
  className,
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <AriaButton
      {...props}
      className={(renderProps) =>
        cn(
          'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50',
          variantClasses[variant],
          typeof className === 'function' ? className(renderProps) : className,
        )
      }
    />
  );
}
