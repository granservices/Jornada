import {
  BellRing,
  CalendarRange,
  ClipboardCheck,
  LifeBuoy,
} from 'lucide-react';
import { SectionCard } from '../components/ui/section-card';
import { StatusPill } from '../components/ui/status-pill';

const boardingEvents = [
  {
    title: 'Embarque previsto',
    subtitle: 'P-73 • Campos',
    date: '24 ago • 06:30',
    tone: 'neutral' as const,
  },
  {
    title: 'Mudança recente',
    subtitle: 'Apresentação antecipada no pátio',
    date: '22 ago • 14:00',
    tone: 'warning' as const,
  },
];

const requirements = [
  { title: 'ASO', date: 'vence em 9 dias', tone: 'warning' as const },
  {
    title: 'CBSP / HUET',
    date: 'vence em 3 dias',
    tone: 'critical' as const,
  },
];

const notices = [
  'Janela de check-in do embarque atualizada para 05:40.',
  'TI publicou novo procedimento para troca de senha corporativa.',
];

export function DashboardPage() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="grid gap-4">
        <SectionCard>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">
                Próxima agenda
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                Seu próximo embarque já deve estar na mão, sem caça ao dado.
              </h1>
            </div>
            <div className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(199,53,44,0.10)] text-[var(--brand-700)] sm:flex">
              <CalendarRange size={22} />
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {boardingEvents.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(255,255,255,0.7)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                      {item.title}
                    </h2>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {item.subtitle}
                    </p>
                  </div>
                  <StatusPill
                    label={item.date}
                    tone={item.tone}
                  />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
        <div className="grid gap-4 sm:grid-cols-2">
          <SectionCard>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(109,118,128,0.10)] text-[var(--text-secondary)]">
                <ClipboardCheck size={18} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  Vencimentos
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  prioridade operacional
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {requirements.map((item) => (
                <div
                  key={item.title}
                  className="flex items-center justify-between gap-3 rounded-xl bg-[rgba(255,255,255,0.6)] px-3 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {item.title}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {item.date}
                    </p>
                  </div>
                  <StatusPill label="alerta" tone={item.tone} />
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(109,118,128,0.10)] text-[var(--text-secondary)]">
                <LifeBuoy size={18} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  Setores
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  canais úteis em breve
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              {['TI', 'Medicina', 'Operações'].map((sector) => (
                <div
                  key={sector}
                  className="rounded-xl bg-[rgba(255,255,255,0.6)] px-3 py-3 text-sm font-medium text-[var(--text-secondary)]"
                >
                  {sector}
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
      <div className="grid gap-4">
        <SectionCard>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(199,53,44,0.10)] text-[var(--brand-700)]">
              <BellRing size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Comunicados recentes
              </h2>
              <p className="text-sm text-[var(--text-muted)]">
                espaço inicial de informes
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {notices.map((notice) => (
              <article
                key={notice}
                className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(255,255,255,0.72)] p-4"
              >
                <p className="text-sm leading-6 text-[var(--text-secondary)]">
                  {notice}
                </p>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
