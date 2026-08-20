import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Button } from '../components/ui/button';
import { PasswordField } from '../components/ui/password-field';
import { TextField } from '../components/ui/text-field';
import { AuthFormShell } from './auth-form-shell';

export function LoginPage() {
  return (
    <AuthFormShell
      submitLabel="Entrar"
      compact
    >
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, ease: 'easeOut' }}
        className="space-y-5"
      >
        <div className="space-y-4">
          <TextField
            aria-label="E-mail"
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
        </div>
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
        <div className="flex items-center justify-center">
          <Link
            to="/register"
            className="text-sm font-medium text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
          >
            Criar conta
          </Link>
        </div>
      </motion.div>
    </AuthFormShell>
  );
}
