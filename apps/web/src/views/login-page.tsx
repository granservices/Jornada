import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { PasswordField } from '../components/ui/password-field';
import { TextField } from '../components/ui/text-field';
import { AuthFormShell } from './auth-form-shell';

const fieldReveal = {
  hidden: { opacity: 0, y: 18, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1 },
};

export function LoginPage() {
  return (
    <AuthFormShell
      submitLabel="Entrar"
      compact
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="mx-auto max-w-[20rem] space-y-5 sm:max-w-none sm:space-y-6"
      >
        <motion.div
          initial={{ opacity: 0, y: -18, scale: 0.9, rotateX: 24 }}
          animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
          transition={{ duration: 0.86, delay: 0.34, ease: [0.16, 1, 0.3, 1] }}
          className="pb-1 sm:pb-2"
        >
          <div className="auth-space-title auth-space-title-modal">
            <p className="auth-space-title-kicker">GranServices</p>
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
                staggerChildren: 0.18,
                delayChildren: 0.82,
              },
            },
          }}
          className="space-y-4 sm:space-y-5"
        >
          <motion.div
            variants={fieldReveal}
            transition={{ duration: 0.64, ease: [0.16, 1, 0.3, 1] }}
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
            variants={fieldReveal}
            transition={{ duration: 0.64, ease: [0.16, 1, 0.3, 1] }}
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
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.58, delay: 1.28, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[rgba(226,232,240,0.76)] sm:justify-between sm:gap-3"
        >
          <label className="auth-remember-checkbox">
            <input
              type="checkbox"
              name="rememberSession"
              value="true"
              defaultChecked
            />
            <span aria-hidden="true" className="auth-remember-checkbox-mark" />
            <span>Manter sessao</span>
          </label>
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-[rgba(226,232,240,0.82)] transition hover:text-white"
          >
            Esqueci minha senha
          </Link>
        </motion.div>
      </motion.div>
    </AuthFormShell>
  );
}
