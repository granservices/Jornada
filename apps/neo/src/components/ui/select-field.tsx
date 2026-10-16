import { Button, FieldError, ListBox, ListBoxItem, Popover, Select, SelectValue, type Key, type SelectProps } from 'react-aria-components/Select';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';

type SelectOption = {
  id: string;
  label: string;
  description?: string;
};

type SelectFieldProps = Omit<SelectProps<SelectOption>, 'children' | 'items'> & {
  label?: string;
  description?: string;
  errorMessage?: string;
  items: SelectOption[];
  placeholder?: string;
};

export function SelectField({
  label,
  description,
  errorMessage,
  items,
  placeholder = 'Selecione',
  className,
  ...props
}: SelectFieldProps) {
  return (
    <Select<SelectOption>
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
      <Button className="flex h-9 w-full items-center gap-2 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 text-left text-[12px] text-[var(--admin-text-primary)] transition outline-none hover:bg-[var(--admin-surface-1)] focus:border-[var(--admin-border-strong)] data-[open]:border-[var(--admin-border-strong)] data-[open]:bg-[var(--admin-panel-active)]">
        <SelectValue className="min-w-0 flex-1 truncate text-[12px] text-[var(--admin-text-primary)]">
          {({ selectedText }) => selectedText || placeholder}
        </SelectValue>
        <ChevronDown size={13} className="shrink-0 text-[var(--admin-text-muted)]" />
      </Button>
      {description ? (
        <p className="text-xs text-[var(--admin-text-muted)]">{description}</p>
      ) : null}
      {errorMessage ? (
        <p className="text-xs text-[var(--danger-600)]">{errorMessage}</p>
      ) : (
        <FieldError className="text-xs text-[var(--danger-600)]" />
      )}
      <Popover className="min-w-(--trigger-width) overflow-hidden rounded-[6px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-1 shadow-[var(--admin-shadow)]">
        <ListBox className="max-h-64 overflow-auto outline-none">
          {items.map((item) => (
            <ListBoxItem
              id={item.id}
              key={item.id}
              textValue={item.label}
              className="rounded-[4px] px-3 py-2 outline-none transition data-[focused]:bg-[var(--admin-panel-active)]"
            >
              <div className="grid gap-0.5">
                <span className="text-[11px] font-semibold text-[var(--admin-text-primary)]">
                  {item.label}
                </span>
                {item.description ? (
                  <span className="text-[10px] text-[var(--admin-text-secondary)]">
                    {item.description}
                  </span>
                ) : null}
              </div>
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </Select>
  );
}

export type { Key, SelectOption };
