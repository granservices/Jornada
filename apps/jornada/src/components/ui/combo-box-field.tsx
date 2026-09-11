import {
  Button,
  ComboBox,
  FieldError,
  Input,
  ListBox,
  ListBoxItem,
  Popover,
  type ComboBoxProps,
} from 'react-aria-components/ComboBox';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '../../lib/cn';

type ComboBoxOption = {
  id: string;
  label: string;
  description?: string;
};

type ComboBoxFieldProps = Omit<ComboBoxProps<ComboBoxOption>, 'children' | 'items'> & {
  label?: string;
  description?: string;
  errorMessage?: string;
  items: ComboBoxOption[];
  placeholder?: string;
};

export function ComboBoxField({
  label,
  description,
  errorMessage,
  items,
  placeholder = 'Pesquisar e selecionar',
  className,
  ...props
}: ComboBoxFieldProps) {
  return (
    <ComboBox<ComboBoxOption>
      {...props}
      items={items}
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
      <div className="flex h-9 items-center gap-2 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 text-[12px] text-[var(--admin-text-primary)] transition outline-none focus-within:border-[var(--admin-border-strong)] focus-within:bg-[var(--admin-panel-active)]">
        <Search size={12} className="shrink-0 text-[var(--admin-text-muted)]" />
        <Input
          placeholder={placeholder}
          className="min-w-0 flex-1 border-0 bg-transparent px-0 text-[12px] text-[var(--admin-text-primary)] outline-none placeholder:text-[var(--admin-text-muted)]"
        />
        <Button className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] border border-transparent text-[var(--admin-text-muted)] transition hover:border-[var(--admin-border)] hover:bg-[var(--admin-surface-1)] hover:text-[var(--admin-text-primary)]">
          <ChevronDown size={13} />
        </Button>
      </div>
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
    </ComboBox>
  );
}

export type { ComboBoxOption };
