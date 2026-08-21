import {
  FieldError,
  Input,
  Label,
  TextField as AriaTextField,
  type TextFieldProps as AriaTextFieldProps,
} from 'react-aria-components';
import { cn } from '../../lib/cn';

type TextFieldProps = AriaTextFieldProps & {
  label: string;
  description?: string;
  inputClassName?: string;
  placeholder?: string;
  appearance?: 'default' | 'line';
};

export function TextField({
  label,
  description,
  className,
  inputClassName,
  placeholder,
  appearance = 'default',
  ...props
}: TextFieldProps) {
  const labelClassName =
    appearance === 'line'
      ? 'text-xs font-semibold uppercase tracking-[0.12em] text-[rgba(226,232,240,0.62)] transition group-focus-within:text-white'
      : 'text-sm font-medium text-[var(--text-secondary)]';

  const inputBaseClassName =
    appearance === 'line'
      ? 'min-h-10 border-0 bg-transparent px-0 text-[15px] font-medium text-white outline-none transition placeholder:text-[rgba(226,232,240,0.34)] focus:ring-0'
      : 'min-h-12 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] px-4 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--border-strong)] focus:ring-2 focus:ring-[var(--focus-ring)]';

  return (
    <AriaTextField
      {...props}
      className={
        typeof className === 'function'
          ? className
          : cn(
              appearance === 'line'
                ? 'auth-line-field group relative flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_16px_36px_-28px_rgba(0,0,0,0.85)] transition duration-200 before:pointer-events-none before:absolute before:inset-x-4 before:bottom-0 before:h-px before:bg-[linear-gradient(90deg,transparent,rgba(253,0,0,0.32),rgba(125,211,252,0.28),transparent)] before:opacity-60 hover:-translate-y-0.5 hover:border-white/24 hover:bg-white/[0.055] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_42px_-28px_rgba(0,0,0,0.85),0_0_26px_rgba(125,211,252,0.08)] focus-within:-translate-y-0.5 focus-within:border-[rgba(253,0,0,0.58)] focus-within:bg-white/[0.07] focus-within:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_18px_46px_-26px_rgba(0,0,0,0.9),0_0_0_1px_rgba(253,0,0,0.16),0_0_32px_rgba(253,0,0,0.16)]'
                : 'flex flex-col gap-2',
              className,
            )
      }
    >
      <Label className={labelClassName}>
        {label}
      </Label>
      <Input
        placeholder={placeholder}
        className={cn(
          inputBaseClassName,
          inputClassName,
        )}
      />
      {description ? (
        <p className="text-xs text-[var(--text-muted)]">{description}</p>
      ) : null}
      <FieldError className="text-xs text-[var(--danger-600)]" />
    </AriaTextField>
  );
}
