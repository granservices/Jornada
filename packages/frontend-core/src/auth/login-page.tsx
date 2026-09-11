import { startTransition, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { PasswordField } from '../ui/password-field';
import { TextField } from '../ui/text-field';
import { AuthFormShell } from './auth-form-shell';
import { loginWithPassword } from './auth-api';
import { defaultRouteForAuthenticatedUser } from './auth-routing';
import { persistAuthSession, type AuthSessionSnapshot } from './auth-session';
import { useAuthSession } from './use-auth-session';

const fieldReveal = {
  hidden: { opacity: 0, y: 18, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1 },
};

function defaultLoginRedirect(nextSession: AuthSessionSnapshot) {
  return defaultRouteForAuthenticatedUser(
    nextSession.user,
    nextSession.applications,
  );
}

export function LoginPage({
  getRedirectTo = defaultLoginRedirect,
  productName = 'Jornada',
}: {
  getRedirectTo?: (nextSession: AuthSessionSnapshot) => string;
  productName?: string;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const session = useAuthSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    startTransition(() => {
      void navigate(
        getRedirectTo(session),
        { replace: true },
      );
    });
  }, [getRedirectTo, navigate, session]);

  useEffect(() => {
    if (!location.search) {
      return;
    }

    startTransition(() => {
      void navigate('/login', { replace: true });
    });
  }, [location.search, navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    const formData = new FormData(event.currentTarget);
    const identifier = String(formData.get('identifier') ?? '').trim();
    const password = String(formData.get('password') ?? '');
    const rememberSession = formData.get('rememberSession') === 'true';

    if (!identifier || !password) {
      setSubmitError('Informe email ou matricula e a senha.');
      setIsSubmitting(false);
      return;
    }

    try {
      const nextSession = await loginWithPassword({ identifier, password });
      persistAuthSession(nextSession, { persistent: rememberSession });
      startTransition(() => {
        void navigate(
          getRedirectTo(nextSession),
          { replace: true },
        );
      });
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Nao foi possivel entrar agora.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthFormShell
      submitLabel="Entrar"
      compact
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitError={submitError}
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
            <h1 className="auth-space-title-main">{productName}</h1>
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
              aria-label="Matricula ou e-mail"
              label="Matricula ou e-mail"
              name="identifier"
              type="text"
              placeholder="Digite sua matricula ou email"
              autoComplete="username"
              inputMode="text"
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
              name="password"
              placeholder="Digite sua senha"
              autoComplete="current-password"
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
