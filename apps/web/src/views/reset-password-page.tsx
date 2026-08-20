import { PasswordField } from '../components/ui/password-field';
import { AuthFormShell } from './auth-form-shell';

export function ResetPasswordPage() {
  return (
    <AuthFormShell
      eyebrow="Redefinição"
      title="Definir nova senha"
      description="A base já considera token, auditoria e revogação de sessões futuras."
      submitLabel="Salvar nova senha"
      footerText="Precisa recomeçar?"
      footerActionLabel="Solicitar novo link"
      footerActionTo="/forgot-password"
    >
      <PasswordField
        label="Nova senha"
        name="password"
        placeholder="Digite a nova senha"
      />
      <PasswordField
        label="Confirmar senha"
        name="passwordConfirmation"
        placeholder="Repita a nova senha"
      />
    </AuthFormShell>
  );
}
