import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { PasswordField } from '../components/ui/password-field';
import { TextField } from '../components/ui/text-field';
import { AuthFormShell } from './auth-form-shell';

export function LoginPage() {
  return (
    <AuthFormShell
      eyebrow="Acesso"
      title="Entrar no Jornada"
      description="Consulta rápida para embarque, vencimentos e comunicados operacionais."
      submitLabel="Entrar"
      footerText="Primeiro acesso?"
      footerActionLabel="Criar conta"
      footerActionTo="/register"
    >
      <TextField
        label="E-mail"
        name="email"
        type="email"
        placeholder="voce@granservices.com.br"
      />
      <PasswordField
        label="Senha"
        name="password"
        placeholder="Digite sua senha"
      />
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" className="px-0 text-sm" type="button">
          Manter sessão
        </Button>
        <Link
          to="/forgot-password"
          className="text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
        >
          Esqueci minha senha
        </Link>
      </div>
      <Link
        to="/app"
        className="block text-center text-sm font-medium text-[var(--brand-700)] transition hover:text-[var(--brand-800)]"
      >
        Acessar demonstração
      </Link>
    </AuthFormShell>
  );
}
