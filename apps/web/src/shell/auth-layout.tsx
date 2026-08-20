import { Outlet } from 'react-router-dom';
import { BellRing, CalendarDays, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { BrandMark } from './brand-mark';
import { SectionCard } from '../components/ui/section-card';
import { StatusPill } from '../components/ui/status-pill';

const highlights = [
  {
    icon: CalendarDays,
    title: 'Agenda',
  },
  {
    icon: ShieldCheck,
    title: 'Validades',
  },
  {
    icon: BellRing,
    title: 'Avisos',
  },
];

export function AuthLayout() {
  return (
    <main className="min-h-screen bg-[var(--surface-canvas)] px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-7xl grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:gap-6">
        <section className="order-2 flex flex-col justify-between rounded-[28px] border border-[var(--border-soft)] bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(243,245,247,0.96))] p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.45)] backdrop-blur-xl lg:order-1 lg:p-8">
          <div className="space-y-6">
            <BrandMark />
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, ease: 'easeOut' }}
              className="space-y-3"
            >
              <StatusPill label="Operação Gran Services" />
              <div className="grid max-w-sm gap-3">
                <AuthSignal title="Embarque" subtitle="24 ago" />
                <AuthSignal title="ASO" subtitle="9 dias" />
                <AuthSignal title="Suporte" subtitle="TI • Medicina" />
              </div>
            </motion.div>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45, delay: 0.08, ease: 'easeOut' }}
            className="mt-8 grid gap-3 sm:grid-cols-3"
          >
            {highlights.map(({ icon: Icon, title }) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, ease: 'easeOut' }}
              >
                <SectionCard className="rounded-2xl bg-[rgba(255,255,255,0.62)] p-4">
                  <motion.div
                    whileHover={{ y: -1 }}
                    transition={{ duration: 0.18 }}
                    className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(109,118,128,0.10)] text-[var(--text-secondary)]"
                  >
                    <Icon size={18} strokeWidth={2} />
                  </motion.div>
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                    {title}
                  </h2>
                </SectionCard>
              </motion.div>
            ))}
          </motion.div>
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

function AuthSignal({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(255,255,255,0.6)] px-4 py-3">
      <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
      <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>
    </div>
  );
}
