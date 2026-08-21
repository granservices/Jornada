import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
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
        className="mx-auto max-w-[20rem] space-y-5 sm:max-w-none sm:space-y-6"
      >
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, delay: 0.02, ease: 'easeOut' }}
          className="pb-1 sm:pb-2"
        >
          <div className="auth-space-title auth-space-title-modal">
            <p className="auth-space-title-kicker">Gran Services</p>
            <h1 className="auth-space-title-main">Jornada</h1>
          </div>
        </motion.div>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.08,
                delayChildren: 0.12,
              },
            },
          }}
          className="space-y-4 sm:space-y-5"
        >
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 12 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.34, ease: 'easeOut' }}
          >
            <TextField
              aria-label="E-mail"
              label="E-mail"
              name="workEmail"
              type="email"
              placeholder="voce@granservices.com.br"
              autoComplete="off"
              inputMode="email"
              spellCheck="false"
              appearance="line"
            />
          </motion.div>
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 12 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.34, ease: 'easeOut' }}
          >
            <PasswordField
              label="Senha"
              name="accessKey"
              placeholder="Digite sua senha"
              autoComplete="off"
              appearance="line"
            />
          </motion.div>
        </motion.div>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[rgba(226,232,240,0.76)] sm:justify-between sm:gap-3">
          <span className="text-sm font-medium">Manter sessao</span>
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-[rgba(226,232,240,0.82)] transition hover:text-white"
          >
            Esqueci minha senha
          </Link>
        </div>
      </motion.div>
    </AuthFormShell>
  );
}
