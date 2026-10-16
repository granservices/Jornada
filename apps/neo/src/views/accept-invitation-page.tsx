import { ArrowUpRight, Eye, EyeOff } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { acceptAdministrativeInvitation } from '../features/auth/auth-api';
import { defaultRouteForAuthenticatedUser } from '../features/auth/auth-routing';
import { persistAuthSession } from '../features/auth/auth-session';

export function AcceptInvitationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const urlToken = readInvitationToken(searchParams);
  const [manualToken, setManualToken] = useState('');
  const token = urlToken || readTokenFromText(manualToken);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    if (!token) {
      setSubmitError('Cole o link ou token do convite para continuar.');
      return;
    }

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get('password') ?? '');
    const passwordConfirmation = String(formData.get('passwordConfirmation') ?? '');

    if (password.length < 8) {
      setSubmitError('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }

    if (password !== passwordConfirmation) {
      setSubmitError('As senhas informadas nao conferem.');
      return;
    }

    setIsSubmitting(true);
    try {
      const session = await acceptAdministrativeInvitation({ token, password });
      persistAuthSession(session);
      navigate(defaultRouteForAuthenticatedUser(session.user, session.applications), {
        replace: true,
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Nao foi possivel aceitar o convite agora.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="neo-login min-h-screen min-h-[100svh] bg-[#13080b] text-[#fff5f4]">
      <div aria-hidden="true" className="neo-login-grid" />
      <div aria-hidden="true" className="neo-login-horizon" />
      <div className="relative grid min-h-screen min-h-[100svh] w-full lg:grid-cols-[minmax(0,1fr)_minmax(25rem,34rem)] xl:grid-cols-[minmax(0,1fr)_minmax(28rem,38rem)]">
        <section className="relative hidden overflow-hidden border-r border-white/10 px-8 py-8 lg:flex lg:flex-col xl:px-12 xl:py-10">
          <div aria-hidden="true" className="neo-login-media" />
          <div aria-hidden="true" className="neo-login-media-shade" />
          <div className="relative z-10 my-auto max-w-xl py-12">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/54">
              Convite de acesso
            </p>
            <h1 className="mt-5 w-full max-w-[13ch] text-6xl font-semibold leading-[0.94] tracking-normal text-white xl:text-7xl">
              Entre no <span className="neo-login-brand text-[#c84238]">Neo.</span>
            </h1>
          </div>
        </section>

        <section className="relative flex min-h-screen min-h-[100svh] min-w-0 items-center px-5 py-8 sm:px-8 lg:px-12">
          <div className="mx-auto min-w-0 w-full max-w-md">
            <h2 className="text-4xl font-semibold leading-none text-white sm:text-[2.7rem]">
              Defina sua senha.
            </h2>
            <p className="mt-4 text-sm leading-6 text-white/58">
              Use o convite recebido para ativar sua conta e acessar os módulos liberados.
            </p>

            <form className="mt-10 space-y-5" onSubmit={handleSubmit} noValidate>
              {!urlToken ? (
                <label className="neo-login-field">
                  <span>Token ou link do convite</span>
                  <input
                    name="invitationToken"
                    autoComplete="off"
                    value={manualToken}
                    onChange={(event) => setManualToken(event.target.value)}
                    placeholder="Cole aqui o link /convite?token=..."
                  />
                </label>
              ) : null}

              <label className="neo-login-field">
                <span>Nova senha</span>
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Digite a nova senha"
                />
                <button
                  type="button"
                  className="neo-login-password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </label>

              <label className="neo-login-field">
                <span>Confirmar senha</span>
                <input
                  name="passwordConfirmation"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Repita a nova senha"
                />
              </label>

              {submitError ? <p className="neo-login-error">{submitError}</p> : null}

              <button type="submit" disabled={isSubmitting} className="neo-login-submit">
                <span>{isSubmitting ? 'Ativando acesso...' : 'Entrar no Neo Jornada'}</span>
                <ArrowUpRight size={18} />
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-white/44">
              Já tem uma conta?{' '}
              <Link to="/login" className="font-medium text-[#ffb4a9] transition hover:text-white">
                Voltar ao login
              </Link>
            </p>
          </div>
        </section>

        <footer className="neo-login-brand-signature is-visible">
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

function readInvitationToken(searchParams: URLSearchParams) {
  const searchToken = searchParams.get('token')?.trim();
  if (searchToken) {
    return searchToken;
  }

  const hash = window.location.hash.replace(/^#\/?/, '');
  if (!hash) {
    return '';
  }

  const hashQuery = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : hash;
  return new URLSearchParams(hashQuery).get('token')?.trim() ?? '';
}

function readTokenFromText(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  try {
    const url = new URL(trimmed);
    return url.searchParams.get('token')?.trim() ?? trimmed;
  } catch {
    return trimmed;
  }
}
