import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Button } from './button';
import { TextField } from './text-field';

type PasswordFieldProps = {
  label: string;
  name: string;
  placeholder: string;
  description?: string;
};

export function PasswordField({
  label,
  name,
  placeholder,
  description,
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
        inputClassName="pr-14"
      />
      <Button
        type="button"
        variant="ghost"
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        className="absolute right-2 top-[2.05rem] h-10 min-h-10 w-10 rounded-lg px-0"
        onPress={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
      </Button>
    </div>
  );
}
