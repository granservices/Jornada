import { ArrowUpRight, CircleCheck, Eye, EyeOff } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useReducedMotion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { defaultRouteForAuthenticatedUser } from '../features/auth/auth-routing';
import { loginWithPassword } from '../features/auth/auth-api';
import { persistAuthSession, type AuthSessionSnapshot } from '../features/auth/auth-session';
import { useAuthSession } from '../features/auth/use-auth-session';

const neoSlogan = 'A informação ao seu alcance.';
const neoSloganFirstLine = 'A informação';

function defaultLoginRedirect(nextSession: AuthSessionSnapshot) {
  return defaultRouteForAuthenticatedUser(
    nextSession.user,
    nextSession.applications,
  );
}

export function NeoMiraiLoginPage({
  getRedirectTo = defaultLoginRedirect,
}: {
  getRedirectTo?: (nextSession: AuthSessionSnapshot) => string;
}) {
  const navigate = useNavigate();
  const session = useAuthSession();
  const prefersReducedMotion = useReducedMotion();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSloganComplete, setIsSloganComplete] = useState(prefersReducedMotion);
  const [typedSlogan, setTypedSlogan] = useState(
    prefersReducedMotion ? neoSlogan : '',
  );

  useEffect(() => {
    if (prefersReducedMotion) {
      setTypedSlogan(neoSlogan);
      setIsSloganComplete(true);
      return;
    }

    setTypedSlogan('');
    setIsSloganComplete(false);
    let index = 0;
    let timeout = 0;
    const typeNextCharacter = () => {
      index += 1;
      setTypedSlogan(neoSlogan.slice(0, index));

      if (index === neoSlogan.length) {
        timeout = window.setTimeout(() => setIsSloganComplete(true), 180);
        return;
      }

      timeout = window.setTimeout(
        typeNextCharacter,
        typewriterDelay(neoSlogan[index - 1]),
      );
    };

    timeout = window.setTimeout(typeNextCharacter, 260);

    return () => window.clearTimeout(timeout);
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (session) {
      void navigate(
        getRedirectTo(session),
        { replace: true },
      );
    }
  }, [getRedirectTo, navigate, session]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    const formData = new FormData(event.currentTarget);
    const identifier = String(formData.get('identifier') ?? '').trim();
    const password = String(formData.get('password') ?? '');
    const rememberSession = formData.get('rememberSession') === 'true';

    if (!identifier || !password) {
      setSubmitError('Informe sua matrícula ou e-mail e a senha.');
      return;
    }

    setIsSubmitting(true);

    try {
      const nextSession = await loginWithPassword({ identifier, password });
      persistAuthSession(nextSession, { persistent: rememberSession });
      void navigate(
        getRedirectTo(nextSession),
        { replace: true },
      );
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Não foi possível entrar agora.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="neo-login min-h-screen min-h-[100svh] bg-[#13080b] text-[#fff5f4]">
      <div aria-hidden="true" className="neo-login-grid" />
      <div aria-hidden="true" className="neo-login-horizon" />
      <div className="relative grid min-h-screen min-h-[100svh] w-full lg:grid-cols-[minmax(0,1fr)_minmax(25rem,34rem)] xl:grid-cols-[minmax(0,1fr)_minmax(28rem,38rem)]">
        <section className="relative hidden overflow-hidden border-r border-white/10 px-8 py-8 lg:flex lg:flex-col xl:px-12 xl:py-10">
          <div aria-hidden="true" className="neo-login-media" />
          <div aria-hidden="true" className="neo-login-media-shade" />
          <div className="relative z-10 my-auto max-w-xl py-12">
            <h1 className="w-full max-w-[14ch] text-6xl font-semibold leading-[0.94] tracking-normal text-white xl:text-7xl">
              <span className="neo-login-typewriter">
                {typedSlogan.split(' ').map((word, index) => (
                  <span key={`${word}-${index}`} className="neo-login-typewriter-word">
                    {index > 0 && !(index === 2 && typedSlogan.length >= neoSloganFirstLine.length)
                      ? ' '
                      : ''}
                    {word}
                    {index === 1 && typedSlogan.length >= neoSloganFirstLine.length ? <br /> : null}
                  </span>
                ))}
              </span>
            </h1>
          </div>

        </section>

        <section className="relative flex min-h-screen min-h-[100svh] min-w-0 items-center px-5 py-8 sm:px-8 lg:px-12">
          <div className="mx-auto min-w-0 w-full max-w-md">
            <h2 className="text-4xl font-semibold leading-none text-white sm:text-[2.7rem]">
              Bem-vindo ao <span className="neo-login-brand text-[#c84238]">Neo.</span>
            </h2>

            <form className="mt-10 space-y-5" onSubmit={handleSubmit} noValidate>
              <label className="neo-login-field">
                <span>Matrícula ou e-mail</span>
                <input name="identifier" autoComplete="username" inputMode="text" placeholder="Digite sua identificação" />
              </label>

              <label className="neo-login-field">
                <span>Senha</span>
                <input name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Digite sua senha" />
                <button
                  type="button"
                  className="neo-login-password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </label>

              <div className="flex flex-col items-start gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                <label className="neo-login-remember">
                  <input name="rememberSession" type="checkbox" value="true" defaultChecked />
                  <span aria-hidden="true"><CircleCheck size={13} /></span>
                  Manter conectado
                </label>
                <Link to="/forgot-password" className="shrink-0 text-xs font-medium text-[#ffb4a9] transition hover:text-white">Esqueci minha senha</Link>
              </div>

              {submitError ? <p className="neo-login-error">{submitError}</p> : null}

              <button type="submit" disabled={isSubmitting} className="neo-login-submit">
                <span>{isSubmitting ? 'Verificando acesso...' : 'Entrar no Neo'}</span>
                <ArrowUpRight size={18} />
              </button>
            </form>

          </div>
        </section>

        <footer
          className={`neo-login-brand-signature${
            isSloganComplete ? ' is-visible' : ''
          }`}
        >
          <div className="flex items-center justify-center gap-3">
            <img src="/crew-logo.png" alt="GranServices" className="h-8 w-8 object-contain opacity-85" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/62">
              GranServices
            </span>
          </div>
          <p className="mt-2 text-center text-[10px] font-medium tracking-[0.04em] text-white/42">
            Todos os direitos reservados. © 2026 GranServices.
          </p>
        </footer>
      </div>
    </main>
  );
}

function typewriterDelay(previousCharacter: string) {
  if (previousCharacter === ' ') {
    return 120;
  }

  if (/[.,!?]/.test(previousCharacter)) {
    return 360;
  }

  return 76;
}
