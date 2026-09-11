import { PasswordField } from '../components/ui/password-field';
import { TextField } from '../components/ui/text-field';
import { AuthFormShell } from './auth-form-shell';

export function RegisterPage() {
  return (
    <AuthFormShell
      eyebrow="Cadastro"
      title="Criar acesso do colaborador"
      description="O cadastro já nasce preparado para vínculo operacional, setor e trilha de auditoria."
      submitLabel="Criar conta"
      footerText="Já possui acesso?"
      footerActionLabel="Entrar"
      footerActionTo="/login"
    >
      <TextField
        label="Nome completo"
        name="fullName"
        placeholder="Como aparece no cadastro"
      />
      <TextField
        label="E-mail"
        name="email"
        type="email"
        placeholder="voce@granservices.com.br"
      />
      <TextField
        label="Matrícula"
        name="registration"
        placeholder="Identificador operacional"
      />
      <PasswordField
        label="Senha"
        name="password"
        placeholder="Crie uma senha forte"
        description="No próximo loop, vamos ligar esta tela ao backend real de auth."
      />
    </AuthFormShell>
  );
}
