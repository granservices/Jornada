import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Button } from './button';
import { TextField } from './text-field';

type PasswordFieldProps = {
  label: string;
  name: string;
  placeholder: string;
  description?: string;
  appearance?: 'default' | 'line';
  autoComplete?: string;
};

export function PasswordField({
  label,
  name,
  placeholder,
  description,
  appearance = 'default',
  autoComplete,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <TextField
        label={label}
        name={name}
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        description={description}
        appearance={appearance}
        autoComplete={autoComplete}
        inputClassName={appearance === 'line' ? 'pr-12' : 'pr-14'}
      />
      <Button
        type="button"
        variant="ghost"
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        className={
          appearance === 'line'
            ? 'absolute right-3 top-[2.15rem] h-9 min-h-9 w-9 rounded-[6px] px-0 text-white/58 hover:bg-white/8 hover:text-white data-[focus-visible]:ring-white/20'
            : 'absolute right-2 top-[2.05rem] h-10 min-h-10 w-10 rounded-[4px] px-0'
        }
        onPress={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
      </Button>
    </div>
  );
}
