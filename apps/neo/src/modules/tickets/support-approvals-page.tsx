import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, MessageSquareWarning, X } from 'lucide-react';
import { SectionCard } from '../../components/ui/section-card';
import { StatusPill } from '../../components/ui/status-pill';
import {
  decideApproval,
  listApprovalRequests,
  type ApprovalRequest,
} from './support-api';

const decisionMeta: Record<
  'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED',
  { label: string; icon: typeof Check }
> = {
  APPROVED: { label: 'Aprovar', icon: Check },
  REJECTED: { label: 'Rejeitar', icon: X },
  CHANGES_REQUESTED: { label: 'Pedir ajuste', icon: MessageSquareWarning },
};

export function SupportApprovalsPage() {
  const queryClient = useQueryClient();
  const approvalsQuery = useQuery({
    queryKey: ['support', 'approvals'],
    queryFn: listApprovalRequests,
  });
  const [decisionDraft, setDecisionDraft] = useState<{
    approvalId: string;
    decision: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';
    comment: string;
  } | null>(null);
  const decisionMutation = useMutation({
    mutationFn: decideApproval,
    onSuccess: async () => {
      setDecisionDraft(null);
      await queryClient.invalidateQueries({ queryKey: ['support', 'approvals'] });
      await queryClient.invalidateQueries({ queryKey: ['support', 'cases'] });
    },
  });
  const approvals = approvalsQuery.data?.items ?? [];

  return (
    <main className="grid w-full gap-2 text-[var(--admin-text-primary)]">
      <section className="grid gap-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--admin-text-muted)]">
          Atendimento
        </p>
        <h1 className="text-[18px] font-semibold">Aprovações</h1>
      </section>

      <SectionCard className="overflow-hidden rounded-[6px] border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-0 shadow-[var(--admin-shadow)]">
        {approvalsQuery.isLoading ? (
          <EmptyApprovals title="Carregando aprovações" body="Buscando pendências das equipes aprovadoras." />
        ) : null}
        {approvalsQuery.isError ? (
          <EmptyApprovals title="Não foi possível carregar" body={approvalsQuery.error.message} />
        ) : null}
        {!approvalsQuery.isLoading && !approvalsQuery.isError && approvals.length === 0 ? (
          <EmptyApprovals title="Sem aprovações pendentes" body="As solicitações aguardando decisão aparecerão aqui." />
        ) : null}
        {approvals.length > 0 ? (
          <div className="divide-y divide-[var(--admin-border)]">
            {approvals.map((approval) => (
              <ApprovalRow
                key={approval.id}
                approval={approval}
                draft={decisionDraft}
                pending={decisionMutation.isPending}
                error={decisionMutation.error?.message ?? null}
                onStartDecision={(decision) =>
                  setDecisionDraft({ approvalId: approval.id, decision, comment: '' })
                }
                onCommentChange={(comment) =>
                  setDecisionDraft((current) =>
                    current && current.approvalId === approval.id
                      ? { ...current, comment }
                      : current,
                  )
                }
                onCancelDecision={() => setDecisionDraft(null)}
                onConfirmDecision={() => {
                  if (!decisionDraft || decisionDraft.approvalId !== approval.id) {
                    return;
                  }

                  decisionMutation.mutate({
                    approvalRequestId: approval.id,
                    decision: decisionDraft.decision,
                    comment: decisionDraft.comment.trim() || undefined,
                  });
                }}
              />
            ))}
          </div>
        ) : null}
      </SectionCard>
    </main>
  );
}

function ApprovalRow({
  approval,
  draft,
  pending,
  error,
  onStartDecision,
  onCommentChange,
  onCancelDecision,
  onConfirmDecision,
}: {
  approval: ApprovalRequest;
  draft: { approvalId: string; decision: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED'; comment: string } | null;
  pending: boolean;
  error: string | null;
  onStartDecision: (decision: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED') => void;
  onCommentChange: (comment: string) => void;
  onCancelDecision: () => void;
  onConfirmDecision: () => void;
}) {
  const activeDraft = draft?.approvalId === approval.id ? draft : null;

  return (
    <article className="grid gap-2 px-3 py-3">
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-[13px] font-semibold">{approval.supportCase.title}</h2>
            <StatusPill label={approvalLabel(approval.status)} tone="warning" />
          </div>
          <p className="mt-1 text-[11.5px] text-[var(--admin-text-secondary)]">
            {approval.supportCase.code} • {approval.supportCase.requester.name} • {approval.currentStep?.approvalTeam.name ?? 'Equipe aprovadora'}
          </p>
          {approval.reason ? (
            <p className="mt-1 text-[11.5px] leading-5 text-[var(--admin-text-muted)]">{approval.reason}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['APPROVED', 'REJECTED', 'CHANGES_REQUESTED'] as const).map((decision) => {
            const Icon = decisionMeta[decision].icon;
            return (
              <button
                key={decision}
                type="button"
                onClick={() => onStartDecision(decision)}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2 text-[10.5px] font-semibold text-[var(--admin-text-primary)] transition hover:bg-[var(--admin-panel-active)]"
              >
                <Icon size={13} />
                {decisionMeta[decision].label}
              </button>
            );
          })}
        </div>
      </div>

      {activeDraft ? (
        <div className="grid gap-2 rounded-[6px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-2">
          <p className="text-[11.5px] font-semibold text-[var(--admin-text-secondary)]">
            {decisionMeta[activeDraft.decision].label}
          </p>
          <textarea
            value={activeDraft.comment}
            onChange={(event) => onCommentChange(event.currentTarget.value)}
            rows={3}
            placeholder={
              activeDraft.decision === 'CHANGES_REQUESTED'
                ? 'Explique o ajuste para o colaborador.'
                : 'Comentário opcional para auditoria.'
            }
            className="resize-none rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-2 py-2 text-[12px] text-[var(--admin-text-primary)] outline-none placeholder:text-[var(--admin-text-muted)]"
          />
          {error ? <p className="text-[11px] text-[var(--admin-danger-text)]">{error}</p> : null}
          <div className="flex justify-end gap-1.5">
            <button type="button" onClick={onCancelDecision} className="h-8 rounded-[4px] border border-[var(--admin-border)] px-2 text-[10.5px] font-semibold text-[var(--admin-text-secondary)]">
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirmDecision}
              disabled={pending || (activeDraft.decision === 'CHANGES_REQUESTED' && !activeDraft.comment.trim())}
              className="h-8 rounded-[4px] border border-[var(--admin-border-strong)] bg-[var(--admin-panel-active)] px-2 text-[10.5px] font-semibold text-[var(--admin-text-primary)] disabled:opacity-50"
            >
              Confirmar
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function approvalLabel(status: ApprovalRequest['status']) {
  const labels: Record<ApprovalRequest['status'], string> = {
    PENDING: 'pendente',
    APPROVED: 'aprovada',
    REJECTED: 'rejeitada',
    CHANGES_REQUESTED: 'ajuste solicitado',
    CANCELLED: 'cancelada',
    EXPIRED: 'expirada',
  };

  return labels[status];
}

function EmptyApprovals({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid min-h-[220px] place-items-center px-4 py-10 text-center">
      <div>
        <p className="text-[13px] font-semibold">{title}</p>
        <p className="mt-1 max-w-[26rem] text-[11.5px] leading-5 text-[var(--admin-text-muted)]">{body}</p>
      </div>
    </div>
  );
}
