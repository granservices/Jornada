import {
  Button,
  FieldError,
  Input,
  Label,
  SearchField as AriaSearchField,
  type SearchFieldProps as AriaSearchFieldProps,
} from 'react-aria-components/SearchField';
import { Search, X } from 'lucide-react';
import { cn } from '../../lib/cn';

type SearchFieldProps = AriaSearchFieldProps & {
  label?: string;
  description?: string;
  inputClassName?: string;
  placeholder?: string;
  appearance?: 'default' | 'compact';
};

export function SearchField({
  label,
  description,
  className,
  inputClassName,
  placeholder,
  appearance = 'default',
  ...props
}: SearchFieldProps) {
  const rootClassName =
    appearance === 'compact'
      ? 'group flex min-w-0 items-center gap-2 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2.5 text-[12px] text-[var(--admin-text-secondary)] transition data-[focus-within]:border-[var(--admin-border-strong)] data-[focus-within]:bg-[var(--admin-panel-active)]'
      : 'group flex flex-col gap-2';

  const inputBaseClassName =
    appearance === 'compact'
      ? 'min-w-0 flex-1 border-0 bg-transparent px-0 text-[11px] text-[var(--admin-text-primary)] outline-none placeholder:text-[var(--admin-text-muted)]'
      : 'min-h-10 w-full rounded-[6px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 text-sm text-[var(--admin-text-primary)] outline-none transition placeholder:text-[var(--admin-text-muted)]';

  return (
    <AriaSearchField
      {...props}
      className={
        typeof className === 'function' ? className : cn(rootClassName, className)
      }
    >
      {label ? (
        <Label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-text-muted)]">
          {label}
        </Label>
      ) : null}
      <div className={appearance === 'compact' ? 'flex min-w-0 flex-1 items-center gap-2' : 'relative'}>
        <Search
          size={appearance === 'compact' ? 12 : 14}
          className={cn(
            'shrink-0 text-[var(--admin-text-muted)]',
            appearance === 'compact' ? '' : 'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2',
          )}
        />
        <Input
          placeholder={placeholder}
          className={cn(
            inputBaseClassName,
            appearance === 'compact' ? '' : 'pl-8 pr-9',
            inputClassName,
          )}
        />
        <Button
          aria-label="Limpar busca"
          className={cn(
            'inline-flex h-6 w-6 items-center justify-center rounded-[4px] border border-transparent text-[var(--admin-text-muted)] transition hover:border-[var(--admin-border)] hover:bg-[var(--admin-surface-1)] hover:text-[var(--admin-text-primary)]',
            appearance === 'compact' ? 'shrink-0' : 'absolute right-2 top-1/2 -translate-y-1/2',
          )}
        >
          <X size={12} />
        </Button>
      </div>
      {description ? (
        <p className="text-xs text-[var(--admin-text-muted)]">{description}</p>
      ) : null}
      <FieldError className="text-xs text-[var(--danger-600)]" />
    </AriaSearchField>
  );
}
