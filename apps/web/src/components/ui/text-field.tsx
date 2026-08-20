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
};

export function TextField({
  label,
  description,
  className,
  inputClassName,
  placeholder,
  ...props
}: TextFieldProps) {
  return (
    <AriaTextField
      {...props}
      className={
        typeof className === 'function'
          ? className
          : cn('flex flex-col gap-2', className)
      }
    >
      <Label className="text-sm font-medium text-[var(--text-secondary)]">
        {label}
      </Label>
      <Input
        placeholder={placeholder}
        className={cn(
          'min-h-12 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] px-4 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--border-strong)] focus:ring-2 focus:ring-[var(--focus-ring)]',
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
