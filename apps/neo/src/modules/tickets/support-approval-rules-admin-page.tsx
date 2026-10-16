import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GitBranch, Plus } from 'lucide-react';
import { SectionCard } from '../../components/ui/section-card';
import { StatusPill } from '../../components/ui/status-pill';
import {
  createApprovalRule,
  listApprovalRules,
  listSupportCatalogAdmin,
  updateApprovalRule,
  type ApprovalRule,
} from './support-api';

const inputClass =
  'h-8 min-w-0 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2 text-[12px] text-[var(--admin-text-primary)] outline-none placeholder:text-[var(--admin-text-muted)]';

export function SupportApprovalRulesAdminPage() {
  const queryClient = useQueryClient();
  const catalogQuery = useQuery({
    queryKey: ['support', 'catalog', 'admin'],
    queryFn: listSupportCatalogAdmin,
  });
  const rulesQuery = useQuery({
    queryKey: ['support', 'approval-rules'],
    queryFn: listApprovalRules,
  });
  const departments = catalogQuery.data?.departments ?? [];
  const teams = catalogQuery.data?.teams ?? [];
  const topics = useMemo(
    () =>
      departments.flatMap((department) =>
        department.topics.map((topic) => ({ ...topic, department })),
      ),
    [departments],
  );
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    departmentId: '',
    topicId: '',
    approvalTeamId: '',
    priority: 100,
    defaultDueMinutes: 60 * 24 * 2,
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });
  const ruleMutation = useMutation({
    mutationFn: () => {
      const payload = {
        departmentId: draft.departmentId || undefined,
        topicId: draft.topicId || undefined,
        approvalTeamId: draft.approvalTeamId,
        priority: draft.priority,
        defaultDueMinutes: draft.defaultDueMinutes,
        status: draft.status,
      };

      return editingRuleId
        ? updateApprovalRule(editingRuleId, payload)
        : createApprovalRule(payload);
    },
    onSuccess: async () => {
      resetDraft();
      await queryClient.invalidateQueries({ queryKey: ['support', 'approval-rules'] });
    },
  });

  const resetDraft = () => {
    setEditingRuleId(null);
    setDraft({
      departmentId: '',
      topicId: '',
      approvalTeamId: '',
      priority: 100,
      defaultDueMinutes: 60 * 24 * 2,
      status: 'ACTIVE',
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.approvalTeamId) {
      return;
    }

    ruleMutation.mutate();
  };

  const editRule = (rule: ApprovalRule) => {
    setEditingRuleId(rule.id);
    setDraft({
      departmentId: rule.department?.id ?? '',
      topicId: rule.topic?.id ?? '',
      approvalTeamId: rule.approvalTeam.id,
      priority: rule.priority,
      defaultDueMinutes: rule.defaultDueMinutes ?? 60 * 24 * 2,
      status: rule.status,
    });
  };

  return (
    <main className="grid w-full gap-2 text-[var(--admin-text-primary)]">
      <section className="grid gap-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--admin-text-muted)]">
          Configuração de atendimento
        </p>
        <h1 className="text-[18px] font-semibold">Regras de aprovação</h1>
      </section>

      <section className="grid gap-2 lg:grid-cols-[minmax(260px,0.7fr)_minmax(0,1.3fr)]">
        <SectionCard className="rounded-[6px] border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-3 shadow-[var(--admin-shadow)]">
          <form onSubmit={handleSubmit} className="grid gap-2">
            <div className="flex items-center gap-2">
              <Plus size={14} className="text-[var(--admin-text-muted)]" />
              <h2 className="text-[13px] font-semibold">{editingRuleId ? 'Editar regra' : 'Nova regra'}</h2>
            </div>
            <label className="grid gap-1 text-[11px] font-semibold text-[var(--admin-text-secondary)]">
              Setor
              <select
                value={draft.departmentId}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setDraft((current) => ({ ...current, departmentId: value, topicId: '' }));
                }}
                className={inputClass}
              >
                <option value="">Todos</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>{department.name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-[11px] font-semibold text-[var(--admin-text-secondary)]">
              Assunto
              <select
                value={draft.topicId}
                onChange={(event) => setDraft((current) => ({ ...current, topicId: event.currentTarget.value }))}
                className={inputClass}
              >
                <option value="">Todos</option>
                {topics
                  .filter((topic) => !draft.departmentId || topic.department.id === draft.departmentId)
                  .map((topic) => (
                    <option key={topic.id} value={topic.id}>{topic.department.name} / {topic.name}</option>
                  ))}
              </select>
            </label>
            <label className="grid gap-1 text-[11px] font-semibold text-[var(--admin-text-secondary)]">
              Equipe aprovadora
              <select
                value={draft.approvalTeamId}
                onChange={(event) => setDraft((current) => ({ ...current, approvalTeamId: event.currentTarget.value }))}
                className={inputClass}
              >
                <option value="">Selecione</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1 text-[11px] font-semibold text-[var(--admin-text-secondary)]">
                Prioridade
                <input
                  type="number"
                  value={draft.priority}
                  onChange={(event) => setDraft((current) => ({ ...current, priority: Number(event.currentTarget.value) || 100 }))}
                  className={inputClass}
                />
              </label>
              <label className="grid gap-1 text-[11px] font-semibold text-[var(--admin-text-secondary)]">
                Prazo min.
                <input
                  type="number"
                  value={draft.defaultDueMinutes}
                  onChange={(event) => setDraft((current) => ({ ...current, defaultDueMinutes: Number(event.currentTarget.value) || 2880 }))}
                  className={inputClass}
                />
              </label>
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              <button
                type="submit"
                disabled={!draft.approvalTeamId || ruleMutation.isPending}
                className="h-8 rounded-[4px] border border-[var(--admin-border-strong)] bg-[var(--admin-panel-active)] px-2 text-[10.5px] font-semibold disabled:opacity-50"
              >
                {ruleMutation.isPending ? 'Salvando...' : editingRuleId ? 'Atualizar' : 'Salvar'}
              </button>
              <button type="button" onClick={resetDraft} className="h-8 rounded-[4px] border border-[var(--admin-border)] px-2 text-[10.5px] font-semibold text-[var(--admin-text-secondary)]">
                Nova
              </button>
            </div>
            {ruleMutation.error ? <p className="text-[11px] text-[var(--admin-danger-text)]">{ruleMutation.error.message}</p> : null}
          </form>
        </SectionCard>

        <SectionCard className="overflow-hidden rounded-[6px] border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-0 shadow-[var(--admin-shadow)]">
          <div className="border-b border-[var(--admin-border)] px-3 py-2">
            <div className="flex items-center gap-2">
              <GitBranch size={14} className="text-[var(--admin-text-muted)]" />
              <h2 className="text-[13px] font-semibold">Regras cadastradas</h2>
            </div>
          </div>
          {rulesQuery.isLoading ? <p className="p-3 text-[12px] text-[var(--admin-text-muted)]">Carregando regras...</p> : null}
          {rulesQuery.data?.items.map((rule) => (
            <button
              key={rule.id}
              type="button"
              onClick={() => editRule(rule)}
              className="grid w-full gap-1 border-b border-[var(--admin-border)] px-3 py-2.5 text-left transition last:border-b-0 hover:bg-[var(--admin-surface-2)]"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-[12.5px] font-semibold">
                  {rule.department?.name ?? 'Todos os setores'} / {rule.topic?.name ?? 'Todos os assuntos'}
                </span>
                <StatusPill label={rule.status === 'ACTIVE' ? 'ativa' : 'inativa'} tone="neutral" />
              </span>
              <span className="text-[11px] text-[var(--admin-text-muted)]">
                Aprova por {rule.approvalTeam.name} • prazo {rule.defaultDueMinutes ?? 2880} min
              </span>
            </button>
          ))}
          {!rulesQuery.isLoading && (rulesQuery.data?.items.length ?? 0) === 0 ? (
            <p className="p-3 text-[12px] text-[var(--admin-text-muted)]">Nenhuma regra cadastrada.</p>
          ) : null}
        </SectionCard>
      </section>
    </main>
  );
}
