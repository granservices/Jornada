import { TextField } from '../components/ui/text-field';
import { AuthFormShell } from './auth-form-shell';

export function ForgotPasswordPage() {
  return (
    <AuthFormShell
      eyebrow="Recuperação"
      title="Recuperar senha"
      description="Enviamos um fluxo simples e rastreável para o e-mail do colaborador."
      submitLabel="Enviar instruções"
      footerText="Lembrou a senha?"
      footerActionLabel="Voltar ao login"
      footerActionTo="/login"
    >
      <TextField
        label="E-mail"
        name="email"
        type="email"
        placeholder="voce@granservices.com.br"
      />
    </AuthFormShell>
  );
}
