import {
  Button,
  FieldError,
  Group,
  Input,
  NumberField as AriaNumberField,
  type NumberFieldProps as AriaNumberFieldProps,
} from 'react-aria-components/NumberField';
import { Minus, Plus } from 'lucide-react';
import { cn } from '../../lib/cn';

type NumberFieldProps = AriaNumberFieldProps & {
  label?: string;
  description?: string;
  errorMessage?: string;
};

export function NumberField({
  label,
  description,
  errorMessage,
  className,
  ...props
}: NumberFieldProps) {
  return (
    <AriaNumberField
      {...props}
      className={
        typeof className === 'function'
          ? className
          : cn('group flex flex-col gap-1.5', className)
      }
    >
      {label ? (
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-text-muted)]">
          {label}
        </span>
      ) : null}
      <Group className="flex h-9 items-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[var(--admin-text-primary)] transition focus-within:border-[var(--admin-border-strong)] focus-within:bg-[var(--admin-panel-active)]">
        <Button
          slot="decrement"
          className="inline-flex h-full w-9 items-center justify-center border-r border-[var(--admin-border)] text-[var(--admin-text-muted)] transition hover:bg-[var(--admin-surface-1)] hover:text-[var(--admin-text-primary)]"
        >
          <Minus size={12} />
        </Button>
        <Input className="min-w-0 flex-1 border-0 bg-transparent px-3 text-center text-[12px] text-[var(--admin-text-primary)] outline-none placeholder:text-[var(--admin-text-muted)]" />
        <Button
          slot="increment"
          className="inline-flex h-full w-9 items-center justify-center border-l border-[var(--admin-border)] text-[var(--admin-text-muted)] transition hover:bg-[var(--admin-surface-1)] hover:text-[var(--admin-text-primary)]"
        >
          <Plus size={12} />
        </Button>
      </Group>
      {description ? (
        <p className="text-xs text-[var(--admin-text-muted)]">{description}</p>
      ) : null}
      {errorMessage ? (
        <p className="text-xs text-[var(--danger-600)]">{errorMessage}</p>
      ) : (
        <FieldError className="text-xs text-[var(--danger-600)]" />
      )}
    </AriaNumberField>
  );
}
