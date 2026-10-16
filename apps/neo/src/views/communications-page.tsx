import { ArrowUpRight, Megaphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SectionCard } from '../components/ui/section-card';
import { internalContractFixtures } from '../features/contracts/internal-contract-fixtures';

export function CommunicationsPage() {
  return (
    <main className="mx-auto grid w-full max-w-5xl gap-3">
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-text-muted)]">Jornada</p>
        <h2 className="mt-1 text-[15px] font-semibold text-[var(--admin-text-primary)]">Comunicados</h2>
      </section>
      <div className="grid gap-2">
        {internalContractFixtures.communications.map((communication) => (
          <SectionCard key={communication.communicationId} className="p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)]">
                <Megaphone size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-[13px] font-semibold text-[var(--admin-text-primary)]">{communication.title}</h3>
                <p className="mt-1 text-[12px] leading-5 text-[var(--admin-text-secondary)]">{communication.summary}</p>
              </div>
              <Link
                to={`/atendimento?modo=new&communicationId=${encodeURIComponent(communication.communicationId)}&sourceModule=JORNADA`}
                className="inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-[3px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2.5 text-[11px] font-medium text-[var(--admin-text-primary)] transition hover:bg-[var(--admin-panel-active)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              >
                Falar com atendimento
                <ArrowUpRight size={13} />
              </Link>
            </div>
          </SectionCard>
        ))}
      </div>
    </main>
  );
}
