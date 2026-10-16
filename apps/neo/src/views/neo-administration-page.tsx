import { ArrowRight, PanelsTopLeft, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SectionCard } from '../components/ui/section-card';

const administrationAreas = [
  {
    title: 'Aplicativos',
    description: 'Cadastre modulos nativos e redirecionamentos do catalogo Neo.',
    to: '/administracao/aplicativos',
    icon: PanelsTopLeft,
  },
  {
    title: 'Usuarios e acessos',
    description: 'Consulte pessoas e defina quais aplicativos cada uma pode abrir.',
    to: '/administracao/usuarios',
    icon: UsersRound,
  },
];

export function NeoAdministrationPage() {
  return (
    <main className="mx-auto grid w-full max-w-5xl gap-3">
      <section className="max-w-2xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-text-muted)]">
          Administração global
        </p>
        <h2 className="mt-1 text-[15px] font-semibold text-[var(--admin-text-primary)]">
          Configurações do Neo
        </h2>
        <p className="mt-1 text-[12px] leading-5 text-[var(--admin-text-secondary)]">
          Controle o catálogo e os acessos compartilhados sem misturar essas decisões com os módulos operacionais.
        </p>
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        {administrationAreas.map(({ title, description, to, icon: Icon }) => (
          <Link key={to} to={to} className="group outline-none">
            <SectionCard className="flex min-h-30 flex-col justify-between p-4 transition group-hover:border-[var(--admin-border-strong)] group-focus-visible:border-[var(--admin-border-strong)] group-focus-visible:ring-2 group-focus-visible:ring-[var(--focus-ring)]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)]">
                  <Icon size={16} />
                </div>
                <ArrowRight size={15} className="text-[var(--admin-text-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--admin-text-primary)]" />
              </div>
              <div className="mt-5">
                <h3 className="text-[13px] font-semibold text-[var(--admin-text-primary)]">{title}</h3>
                <p className="mt-1 text-[12px] leading-5 text-[var(--admin-text-secondary)]">{description}</p>
              </div>
            </SectionCard>
          </Link>
        ))}
      </div>
    </main>
  );
}
