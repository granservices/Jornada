import { Outlet } from 'react-router-dom';
import { BellRing, CalendarDays, ShieldCheck } from 'lucide-react';
import { BrandMark } from './brand-mark';
import { SectionCard } from '../components/ui/section-card';
import { StatusPill } from '../components/ui/status-pill';

const highlights = [
  {
    icon: CalendarDays,
    title: 'Agenda operacional',
    detail: 'embarques, trocas de escala e ajustes recentes',
  },
  {
    icon: ShieldCheck,
    title: 'Documentos e treinamentos',
    detail: 'alertas úteis antes do vencimento',
  },
  {
    icon: BellRing,
    title: 'Comunicados importantes',
    detail: 'mudanças de última hora com contexto claro',
  },
];

export function AuthLayout() {
  return (
    <main className="min-h-screen bg-[var(--surface-canvas)] px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-7xl grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:gap-6">
        <section className="order-2 flex flex-col justify-between rounded-[28px] border border-[var(--border-soft)] bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(243,245,247,0.96))] p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.45)] backdrop-blur-xl lg:order-1 lg:p-8">
          <div className="space-y-6">
            <BrandMark />
            <div className="space-y-3">
              <StatusPill label="Base inicial do colaborador" />
              <h1 className="max-w-xl text-3xl font-semibold text-[var(--text-primary)] sm:text-[2.5rem]">
                Um app leve, direto e confiável para rotina embarcada.
              </h1>
              <p className="max-w-lg text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
                A interface nasce primeiro para o celular, mas sem parecer apertada no tablet ou no computador.
              </p>
            </div>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {highlights.map(({ icon: Icon, title, detail }) => (
              <SectionCard
                key={title}
                className="rounded-2xl bg-[rgba(255,255,255,0.62)] p-4"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(109,118,128,0.10)] text-[var(--text-secondary)]">
                  <Icon size={18} strokeWidth={2} />
                </div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  {title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                  {detail}
                </p>
              </SectionCard>
            ))}
          </div>
        </section>
        <section className="order-1 flex items-center justify-center lg:order-2">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </section>
      </div>
    </main>
  );
}
