import { parseDate } from '@internationalized/date';
import {
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  DateInput,
  DatePicker as AriaDatePicker,
  DateSegment,
  Dialog,
  FieldError,
  Group,
  Heading,
  Label,
  Popover,
  type DatePickerProps as AriaDatePickerProps,
  type DateValue,
} from 'react-aria-components';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn';

type DatePickerProps = Omit<AriaDatePickerProps<DateValue>, 'value' | 'defaultValue' | 'onChange'> & {
  label?: string;
  description?: string;
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (value: string | null) => void;
};

export function DatePicker({
  label,
  description,
  value,
  defaultValue,
  onChange,
  className,
  ...props
}: DatePickerProps) {
  return (
    <AriaDatePicker
      {...props}
      value={value ? parseDate(value) : null}
      defaultValue={defaultValue ? parseDate(defaultValue) : undefined}
      onChange={(nextValue) => onChange?.(nextValue ? nextValue.toString() : null)}
      granularity="day"
      className={
        typeof className === 'function'
          ? className
          : cn('group flex flex-col gap-1.5', className)
      }
    >
      {label ? (
        <Label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-text-muted)]">
          {label}
        </Label>
      ) : null}
      <Group className="flex h-9 items-center gap-2 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 text-[12px] text-[var(--admin-text-primary)] transition focus-within:border-[var(--admin-border-strong)] focus-within:bg-[var(--admin-panel-active)]">
        <DateInput className="flex min-w-0 flex-1 items-center gap-0.5">
          {(segment) => (
            <DateSegment
              segment={segment}
              className={({ isPlaceholder, isFocused }) =>
                cn(
                  'rounded-[3px] px-0.5 py-0.5 outline-none',
                  isPlaceholder ? 'text-[var(--admin-text-muted)]' : 'text-[var(--admin-text-primary)]',
                  isFocused ? 'bg-[var(--admin-panel-active)] text-[var(--admin-text-primary)] ring-1 ring-[var(--admin-border-strong)]' : '',
                )
              }
            />
          )}
        </DateInput>
        <Button className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] border border-transparent text-[var(--admin-text-muted)] transition hover:border-[var(--admin-border)] hover:bg-[var(--admin-surface-1)] hover:text-[var(--admin-text-primary)]">
          <CalendarDays size={13} />
        </Button>
      </Group>
      {description ? (
        <p className="text-xs text-[var(--admin-text-muted)]">{description}</p>
      ) : null}
      <FieldError className="text-xs text-[var(--danger-600)]" />
      <Popover className="w-auto overflow-hidden rounded-[6px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-3 shadow-[var(--admin-shadow)]">
        <Dialog className="outline-none">
          <Calendar className="grid gap-3">
            <div className="flex items-center justify-between gap-2">
              <Button
                slot="previous"
                className="inline-flex h-7 w-7 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)] transition hover:bg-[var(--admin-panel-active)] hover:text-[var(--admin-text-primary)]"
              >
                <ChevronLeft size={12} />
              </Button>
              <Heading className="text-[11px] font-semibold text-[var(--admin-text-primary)]" />
              <Button
                slot="next"
                className="inline-flex h-7 w-7 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)] transition hover:bg-[var(--admin-panel-active)] hover:text-[var(--admin-text-primary)]"
              >
                <ChevronRight size={12} />
              </Button>
            </div>
            <CalendarGrid className="border-separate border-spacing-1">
              <CalendarGridHeader>
                {(day) => (
                  <CalendarHeaderCell className="pb-1 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-muted)]">
                    {day}
                  </CalendarHeaderCell>
                )}
              </CalendarGridHeader>
              <CalendarGridBody>
                {(date) => (
                  <CalendarCell
                    date={date}
                    className={({ isSelected, isDisabled, isOutsideVisibleRange, isUnavailable, isFocused }) =>
                      cn(
                        'flex h-8 w-8 items-center justify-center rounded-[4px] text-[11px] outline-none transition',
                        isOutsideVisibleRange ? 'text-transparent' : 'text-[var(--admin-text-primary)]',
                        isDisabled ? 'opacity-35' : '',
                        isUnavailable ? 'line-through opacity-60' : '',
                        isSelected ? 'bg-[var(--admin-panel-active)] font-semibold text-[var(--admin-text-primary)] ring-1 ring-[var(--admin-border-strong)]' : 'hover:bg-[var(--admin-surface-2)]',
                        isFocused ? 'ring-1 ring-[var(--admin-border-strong)]' : '',
                      )
                    }
                  />
                )}
              </CalendarGridBody>
            </CalendarGrid>
          </Calendar>
        </Dialog>
      </Popover>
    </AriaDatePicker>
  );
}
