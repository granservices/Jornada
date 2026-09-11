import {
  Button as AriaButton,
  type ButtonProps as AriaButtonProps,
} from 'react-aria-components/Button';
import { cn } from '../../lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

type ButtonProps = AriaButtonProps & {
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border border-[var(--admin-border-strong)] bg-[var(--admin-panel-active)] text-[var(--admin-text-primary)] shadow-[var(--admin-shadow)] hover:bg-[var(--admin-surface-2)] pressed:bg-[var(--admin-surface-3)]',
  secondary:
    'border border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[var(--admin-text-primary)] hover:bg-[var(--admin-panel-active)] pressed:bg-[var(--admin-surface-3)]',
  ghost:
    'border border-transparent bg-transparent text-[var(--admin-text-secondary)] hover:border-[var(--admin-border)] hover:bg-[var(--admin-surface-2)] hover:text-[var(--admin-text-primary)] pressed:bg-[var(--admin-surface-3)]',
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
          'inline-flex min-h-9 items-center justify-center gap-2 rounded-[3px] px-3 text-sm font-medium transition outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50',
          variantClasses[variant],
          typeof className === 'function' ? className(renderProps) : className,
        )
      }
    />
  );
}
