import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Inbox,
  MessageSquareText,
  Plus,
  RotateCcw,
  Send,
  Stethoscope,
  TicketCheck,
} from 'lucide-react';
import { SectionCard } from '../components/ui/section-card';
import { StatusPill } from '../components/ui/status-pill';
import {
  addSupportCaseMessage,
  createSupportCase,
  getSupportCase,
  getSupportCasePreview,
  listSupportCases,
  listSupportCatalog,
  reopenSupportCase,
  type SupportCaseDetail,
  type SupportCaseListItem,
  type SupportReopenReason,
  type SupportCaseStatus,
  type SupportDepartment,
  type SupportTopic,
  type SupportTopicField,
} from '../modules/tickets/support-api';
import { queryOptionSource } from '../modules/quick-forms/forms-api';
import { useAdminWorkerPreview } from '../features/admin-worker-preview/admin-worker-preview-context';
import { cn } from '../lib/cn';

const statusLabel: Record<SupportCaseStatus, string> = {
  NEW: 'enviado',
  OPEN: 'em atendimento',
  WAITING_REQUESTER: 'aguarda voce',
  WAITING_INTERNAL: 'em analise',
  WAITING_APPROVAL: 'em aprovacao',
  RESOLVED: 'resolvido',
  CLOSED: 'fechado',
};

const statusTone: Record<SupportCaseStatus, 'neutral' | 'warning' | 'critical'> = {
  NEW: 'neutral',
  OPEN: 'neutral',
  WAITING_REQUESTER: 'warning',
  WAITING_INTERNAL: 'neutral',
  WAITING_APPROVAL: 'warning',
  RESOLVED: 'neutral',
  CLOSED: 'neutral',
};

type DynamicFormValue = string | boolean;
type DynamicFormValues = Record<string, DynamicFormValue>;
type DynamicFormErrors = Record<string, string>;

const dynamicFieldClass =
  'h-9 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2 text-[12px] text-[var(--admin-text-primary)] outline-none placeholder:text-[var(--admin-text-muted)]';

const reopenReasonOptions: Array<{ value: SupportReopenReason; label: string }> = [
  { value: 'REQUESTER_NOT_RESOLVED', label: 'Ainda nao foi resolvido' },
  { value: 'REQUESTER_HAS_MORE_INFORMATION', label: 'Tenho mais informacoes' },
  { value: 'OTHER', label: 'Outro motivo' },
];

export function SupportContactPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedCaseId, setSelectedCaseId] = useState(searchParams.get('caso') ?? '');
  const [departmentId, setDepartmentId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const [message, setMessage] = useState('');
  const [formValues, setFormValues] = useState<DynamicFormValues>({});
  const [formErrors, setFormErrors] = useState<DynamicFormErrors>({});
  const [reopenReason, setReopenReason] = useState<SupportReopenReason>('REQUESTER_NOT_RESOLVED');
  const [reopenMessage, setReopenMessage] = useState('');
  const requestedMode = searchParams.get('modo');
  const [composeOpen, setComposeOpen] = useState(requestedMode === 'new');
  const { selectedWorker } = useAdminWorkerPreview();
  const previewReference = selectedWorker?.previewReference;

  const catalogQuery = useQuery({
    queryKey: ['support', 'catalog', 'jornada-contact'],
    queryFn: listSupportCatalog,
  });
  const casesQuery = useQuery({
    queryKey: ['support', 'cases', 'jornada-contact', previewReference ?? 'me'],
    queryFn: () => listSupportCases({ filter: 'all', q: '', previewReference }),
  });
  const detailQuery = useQuery({
    queryKey: ['support', 'cases', selectedCaseId, 'jornada-contact-detail', previewReference ?? 'me'],
    queryFn: () => previewReference
      ? getSupportCasePreview(selectedCaseId, previewReference)
      : getSupportCase(selectedCaseId),
    enabled: Boolean(selectedCaseId),
  });

  const departments = catalogQuery.data?.items ?? [];
  const selectedDepartment = departments.find((department) => department.id === departmentId) ?? null;
  const topics = selectedDepartment?.topics ?? [];
  const selectedCase = detailQuery.data?.item ?? null;

  useEffect(() => {
    const requestedCaseId = searchParams.get('caso') ?? '';
    setSelectedCaseId(requestedCaseId);
    if (requestedCaseId) {
      setComposeOpen(false);
    }
  }, [searchParams]);

  useEffect(() => {
    if (departments.length === 0 || departmentId) {
      return;
    }

    const departmentCode = searchParams.get('setor')?.toLocaleUpperCase('pt-BR');
    const topicCode = searchParams.get('assunto')?.toLocaleUpperCase('pt-BR');
    const matchedDepartment = departments.find((department) => department.code.toLocaleUpperCase('pt-BR') === departmentCode) ?? departments[0];
    const matchedTopic = matchedDepartment.topics.find((topic) => topic.code.toLocaleUpperCase('pt-BR') === topicCode) ?? matchedDepartment.topics[0];

    setDepartmentId(matchedDepartment.id);
    setTopicId(matchedTopic?.id ?? '');
  }, [departmentId, departments, searchParams]);

  const selectedTopic = useMemo(
    () => topics.find((topic) => topic.id === topicId) ?? null,
    [topicId, topics],
  );
  const activeForm = selectedTopic?.form ?? null;

  const createMutation = useMutation({
    mutationFn: createSupportCase,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['support', 'cases'] });
      setComposeOpen(false);
      setDescription('');
      setDescriptionError('');
      setFormValues({});
      setFormErrors({});
      void navigate(`/atendimento?caso=${result.item.id}`, { replace: true });
    },
  });

  const messageMutation = useMutation({
    mutationFn: addSupportCaseMessage,
    onSuccess: async () => {
      setMessage('');
      await queryClient.invalidateQueries({ queryKey: ['support', 'cases'] });
      await queryClient.invalidateQueries({ queryKey: ['support', 'cases', selectedCaseId] });
    },
  });
  const reopenMutation = useMutation({
    mutationFn: reopenSupportCase,
    onSuccess: async (result) => {
      setReopenMessage('');
      setReopenReason('REQUESTER_NOT_RESOLVED');
      await queryClient.invalidateQueries({ queryKey: ['support', 'cases'] });
      await queryClient.invalidateQueries({ queryKey: ['support', 'cases', selectedCaseId] });
      void navigate(`/atendimento?caso=${result.item.id}`, { replace: true });
    },
  });

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!departmentId || !topicId || createMutation.isPending) {
      return;
    }

    const nextFormErrors = activeForm
      ? validateDynamicSupportForm(activeForm.fields, formValues)
      : {};
    setFormErrors(nextFormErrors);

    if (Object.keys(nextFormErrors).length > 0) {
      return;
    }

    const messageRequired = !activeForm;
    if (messageRequired && !description.trim()) {
      setDescriptionError('Descreva rapidamente o que precisa.');
      return;
    }

    setDescriptionError('');
    createMutation.mutate({
      departmentId,
      topicId,
      description: description.trim(),
      previewReference,
      fieldValues: formValuesPayload(activeForm?.fields ?? [], formValues),
    });
  };

  const handleSendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const body = message.trim();
    if (!selectedCaseId || !body || messageMutation.isPending) {
      return;
    }

    messageMutation.mutate({ supportCaseId: selectedCaseId, body, previewReference });
  };
  const handleReopen = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const body = reopenMessage.trim();
    if (!selectedCaseId || !body || reopenMutation.isPending) {
      return;
    }

    reopenMutation.mutate({
      supportCaseId: selectedCaseId,
      reason: reopenReason,
      message: body,
    });
  };

  return (
    <main className="grid w-full gap-2 text-[var(--admin-text-primary)]">
      <section className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--admin-text-muted)]">
            Jornada
          </p>
          <h1 className="truncate text-[18px] font-semibold">Atendimento</h1>
          <p className="mt-0.5 text-[12px] text-[var(--admin-text-secondary)]">
            Converse com o setor certo sem sair da Jornada.
          </p>
          {selectedWorker ? (
            <p className="mt-1 inline-flex max-w-full items-center rounded-[4px] border border-[var(--admin-warning-border)] bg-[var(--admin-warning-bg)] px-2 py-1 text-[11px] font-semibold text-[var(--admin-warning-text)]">
              Validação: {selectedWorker.fullName}
              {selectedWorker.employeeNumber ? ` - ${selectedWorker.employeeNumber}` : ''}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => {
            setComposeOpen(true);
            void navigate('/atendimento?modo=new', { replace: false });
          }}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-[4px] border border-[var(--admin-border-strong)] bg-[var(--admin-panel-active)] px-3 text-[12px] font-semibold text-[var(--admin-text-primary)] transition hover:bg-[var(--admin-accent-bg)]"
        >
          <Plus size={14} />
          Nova mensagem
        </button>
      </section>

      <section className="grid gap-2 lg:grid-cols-[minmax(250px,0.75fr)_minmax(0,1.25fr)]">
        <SectionCard className="overflow-hidden rounded-[6px] border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-0 shadow-[var(--admin-shadow)]">
          <div className="border-b border-[var(--admin-border)] px-3 py-2">
            <div className="flex items-center gap-2">
              <Inbox size={14} className="text-[var(--admin-text-muted)]" />
              <h2 className="text-[12.5px] font-semibold">Minhas conversas</h2>
            </div>
          </div>
          <div className="admin-scrollbar max-h-[min(64vh,34rem)] overflow-y-auto">
            {casesQuery.isLoading ? <ContactEmptyState title="Carregando conversas" body="Buscando seus atendimentos recentes." /> : null}
            {casesQuery.isError ? <ContactEmptyState title="Nao foi possivel carregar" body={casesQuery.error.message} /> : null}
            {!casesQuery.isLoading && !casesQuery.isError && (casesQuery.data?.items.length ?? 0) === 0 ? (
              <ContactEmptyState title="Nenhuma conversa ainda" body="Abra uma mensagem para falar com um setor." />
            ) : null}
            {casesQuery.data?.items.map((supportCase) => (
              <SupportCaseButton
                key={supportCase.id}
                supportCase={supportCase}
                selected={supportCase.id === selectedCaseId}
              />
            ))}
          </div>
        </SectionCard>

        <SectionCard className="min-h-[360px] overflow-hidden rounded-[6px] border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-0 shadow-[var(--admin-shadow)]">
          {composeOpen ? (
            <ContactForm
              departments={departments}
              topics={topics}
              departmentId={departmentId}
              topicId={topicId}
              description={description}
              descriptionError={descriptionError}
              activeForm={activeForm}
              formValues={formValues}
              formErrors={formErrors}
              pending={createMutation.isPending}
              error={createMutation.error?.message ?? null}
              onDepartmentChange={(nextDepartmentId) => {
                const nextDepartment = departments.find((department) => department.id === nextDepartmentId);
                setDepartmentId(nextDepartmentId);
                setTopicId(nextDepartment?.topics[0]?.id ?? '');
                setFormValues({});
                setFormErrors({});
              }}
              onTopicChange={(nextTopicId) => {
                setTopicId(nextTopicId);
                setFormValues({});
                setFormErrors({});
                setDescriptionError('');
              }}
              onDescriptionChange={(value) => {
                setDescription(value);
                if (descriptionError) {
                  setDescriptionError('');
                }
              }}
              onFieldChange={(fieldCode, value) => {
                setFormValues((current) => ({ ...current, [fieldCode]: value }));
                setFormErrors((current) => {
                  const { [fieldCode]: _removed, ...remaining } = current;
                  return remaining;
                });
              }}
              onSubmit={handleCreate}
            />
          ) : selectedCase ? (
            <ContactConversation
              supportCase={selectedCase}
              message={message}
              reopenReason={reopenReason}
              reopenMessage={reopenMessage}
              pending={messageMutation.isPending}
              reopenPending={reopenMutation.isPending}
              error={messageMutation.error?.message ?? null}
              reopenError={reopenMutation.error?.message ?? null}
              onMessageChange={setMessage}
              onReopenReasonChange={setReopenReason}
              onReopenMessageChange={setReopenMessage}
              onSubmit={handleSendMessage}
              onReopen={handleReopen}
            />
          ) : (
            <ContactEmptyState
              title={detailQuery.isLoading ? 'Carregando conversa' : 'Escolha uma conversa'}
              body={detailQuery.isLoading ? 'Buscando mensagens.' : 'Selecione uma conversa ou abra uma nova mensagem.'}
            />
          )}
        </SectionCard>
      </section>
    </main>
  );
}

function SupportCaseButton({ supportCase, selected }: { supportCase: SupportCaseListItem; selected: boolean }) {
  return (
    <Link
      to={`/atendimento?caso=${supportCase.id}`}
      className={cn(
        'grid gap-1 border-b border-[var(--admin-border)] px-3 py-2.5 text-left transition last:border-b-0 hover:bg-[var(--admin-surface-2)]',
        selected ? 'bg-[var(--admin-panel-active)]' : 'bg-transparent',
      )}
    >
      <span className="flex min-w-0 items-center justify-between gap-2">
        <span className="truncate text-[12.5px] font-semibold text-[var(--admin-text-primary)]">{supportCase.title}</span>
        <StatusPill label={statusLabel[supportCase.status]} tone={statusTone[supportCase.status]} />
      </span>
      <span className="truncate text-[11.5px] text-[var(--admin-text-secondary)]">
        {supportCase.department?.name ?? supportCase.teamName}
        {supportCase.topic ? ` - ${supportCase.topic.name}` : ''}
      </span>
      <span className="text-[10.5px] text-[var(--admin-text-muted)]">{supportCase.code}</span>
    </Link>
  );
}

function ContactForm({
  departments,
  topics,
  departmentId,
  topicId,
  description,
  descriptionError,
  activeForm,
  formValues,
  formErrors,
  pending,
  error,
  onDepartmentChange,
  onTopicChange,
  onDescriptionChange,
  onFieldChange,
  onSubmit,
}: {
  departments: SupportDepartment[];
  topics: SupportTopic[];
  departmentId: string;
  topicId: string;
  description: string;
  descriptionError: string;
  activeForm: SupportTopic['form'];
  formValues: DynamicFormValues;
  formErrors: DynamicFormErrors;
  pending: boolean;
  error: string | null;
  onDepartmentChange: (value: string) => void;
  onTopicChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onFieldChange: (fieldCode: string, value: DynamicFormValue) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="grid gap-3 p-3">
      <div className="flex items-center gap-2 border-b border-[var(--admin-border)] pb-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)]">
          <TicketCheck size={15} />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-[13px] font-semibold">Nova mensagem para atendimento</h2>
          <p className="text-[11.5px] text-[var(--admin-text-muted)]">Escolha setor, assunto e preencha os dados necessarios.</p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-[11px] font-semibold text-[var(--admin-text-secondary)]">
          Setor
          <select
            value={departmentId}
            onChange={(event) => onDepartmentChange(event.currentTarget.value)}
            className="h-9 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2 text-[12px] text-[var(--admin-text-primary)] outline-none"
          >
            {departments.map((department) => (
              <option key={department.id} value={department.id}>{department.name}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-[11px] font-semibold text-[var(--admin-text-secondary)]">
          Assunto
          <select
            value={topicId}
            onChange={(event) => onTopicChange(event.currentTarget.value)}
            className="h-9 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2 text-[12px] text-[var(--admin-text-primary)] outline-none"
          >
            {topics.map((topic) => (
              <option key={topic.id} value={topic.id}>{topic.name}</option>
            ))}
          </select>
        </label>
      </div>

      {activeForm ? (
        <div className="grid gap-2 rounded-[6px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-2.5">
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold text-[var(--admin-text-primary)]">{activeForm.title}</p>
            {activeForm.description ? (
              <p className="mt-0.5 text-[11px] leading-4 text-[var(--admin-text-muted)]">{activeForm.description}</p>
            ) : null}
          </div>
          <DynamicSupportForm
            fields={activeForm.fields}
            values={formValues}
            errors={formErrors}
            onChange={onFieldChange}
          />
        </div>
      ) : null}

      <label className="grid gap-1 text-[11px] font-semibold text-[var(--admin-text-secondary)]">
        {activeForm ? 'Observacoes adicionais' : 'Mensagem'}
        <textarea
          value={description}
          onChange={(event) => onDescriptionChange(event.currentTarget.value)}
          placeholder={activeForm ? 'Opcional: acrescente algum detalhe que ajude o setor.' : 'Escreva sua duvida ou informe sua disponibilidade.'}
          rows={5}
          className="resize-none rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2 py-2 text-[12px] text-[var(--admin-text-primary)] outline-none placeholder:text-[var(--admin-text-muted)]"
        />
        {descriptionError ? <span className="text-[10.5px] text-[var(--admin-danger-text)]">{descriptionError}</span> : null}
      </label>

      {error ? <p className="text-[11px] text-[var(--admin-danger-text)]">{error}</p> : null}
      <button
        type="submit"
        disabled={!departmentId || !topicId || pending || (!activeForm && !description.trim())}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-[4px] border border-[var(--admin-border-strong)] bg-[var(--admin-panel-active)] px-3 text-[12px] font-semibold text-[var(--admin-text-primary)] transition hover:bg-[var(--admin-accent-bg)] disabled:opacity-50"
      >
        <Send size={14} />
        {pending ? 'Enviando...' : 'Enviar mensagem'}
      </button>
    </form>
  );
}

function DynamicSupportForm({
  fields,
  values,
  errors,
  onChange,
}: {
  fields: SupportTopicField[];
  values: DynamicFormValues;
  errors: DynamicFormErrors;
  onChange: (fieldCode: string, value: DynamicFormValue) => void;
}) {
  return (
    <div className="grid gap-2">
      {fields.map((field) => (
        <DynamicSupportField
          key={field.id}
          field={field}
          value={values[field.code]}
          values={values}
          error={errors[field.code]}
          onChange={(value) => onChange(field.code, value)}
        />
      ))}
    </div>
  );
}

function DynamicSupportField({
  field,
  value,
  values,
  error,
  onChange,
}: {
  field: SupportTopicField;
  value: DynamicFormValue | undefined;
  values: DynamicFormValues;
  error?: string;
  onChange: (value: DynamicFormValue) => void;
}) {
  if (!isDynamicFieldVisible(field, values)) {
    return null;
  }

  const required = isDynamicFieldRequired(field, values);

  return (
    <label className="grid gap-1 text-[11px] font-semibold text-[var(--admin-text-secondary)]">
      <span className="flex items-center justify-between gap-2">
        <span className="truncate">{field.label}</span>
        {required ? <span className="text-[10px] text-[var(--admin-text-muted)]">obrigatorio</span> : null}
      </span>
      <DynamicSupportFieldControl field={field} value={value} onChange={onChange} />
      {error ? <span className="text-[10.5px] text-[var(--admin-danger-text)]">{error}</span> : null}
      {field.helpText || field.sensitive ? (
        <span className="text-[10.5px] leading-4 text-[var(--admin-text-muted)]">
          {field.sensitive ? 'Informacao tratada como sensivel. ' : ''}
          {field.helpText ?? ''}
        </span>
      ) : null}
    </label>
  );
}

function DynamicSupportFieldControl({
  field,
  value,
  onChange,
}: {
  field: SupportTopicField;
  value: DynamicFormValue | undefined;
  onChange: (value: DynamicFormValue) => void;
}) {
  if (field.type === 'TEXTAREA') {
    return (
      <textarea
        value={String(value ?? '')}
        onChange={(event) => onChange(event.currentTarget.value)}
        rows={3}
        className="resize-none rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-2 py-2 text-[12px] text-[var(--admin-text-primary)] outline-none placeholder:text-[var(--admin-text-muted)]"
      />
    );
  }

  if (field.type === 'SELECT') {
    return (
      <DynamicSupportSelectInput
        value={String(value ?? '')}
        options={fieldOptions(field.options)}
        optionSourceKey={field.optionSourceKey ?? undefined}
        onChange={onChange}
      />
    );
  }

  if (field.type === 'BOOLEAN') {
    return (
      <span className="flex min-h-9 items-center gap-2 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-2 text-[12px] text-[var(--admin-text-primary)]">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.currentTarget.checked)}
        />
        Confirmar
      </span>
    );
  }

  if (field.type === 'FILE') {
    return (
      <div className="rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-2 py-2 text-[11px] text-[var(--admin-text-muted)]">
        Anexos privados entram na proxima fase.
      </div>
    );
  }

  return (
    <input
      type={field.type === 'DATE' ? 'date' : field.type === 'NUMBER' ? 'number' : 'text'}
      value={String(value ?? '')}
      onChange={(event) => onChange(event.currentTarget.value)}
      className={dynamicFieldClass}
    />
  );
}

function DynamicSupportSelectInput({
  value,
  options,
  optionSourceKey,
  onChange,
}: {
  value: string;
  options: string[];
  optionSourceKey?: string;
  onChange: (value: string) => void;
}) {
  const remoteOptionsQuery = useQuery({
    queryKey: ['forms', 'option-source', optionSourceKey],
    queryFn: () => queryOptionSource(optionSourceKey!, { limit: 100 }),
    enabled: Boolean(optionSourceKey),
    staleTime: 60_000,
  });
  const availableOptions = optionSourceKey
    ? remoteOptionsQuery.data?.items ?? []
    : options.map((option) => ({ value: option, label: option }));

  return (
    <select
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
      className={dynamicFieldClass}
    >
      <option value="">Selecione</option>
      {availableOptions.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  );
}

function ContactConversation({
  supportCase,
  message,
  reopenReason,
  reopenMessage,
  pending,
  reopenPending,
  error,
  reopenError,
  onMessageChange,
  onReopenReasonChange,
  onReopenMessageChange,
  onSubmit,
  onReopen,
}: {
  supportCase: SupportCaseDetail;
  message: string;
  reopenReason: SupportReopenReason;
  reopenMessage: string;
  pending: boolean;
  reopenPending: boolean;
  error: string | null;
  reopenError: string | null;
  onMessageChange: (value: string) => void;
  onReopenReasonChange: (value: SupportReopenReason) => void;
  onReopenMessageChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReopen: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const reopenState = supportCaseReopenState(supportCase);

  return (
    <div className="flex min-h-[360px] flex-col">
      <div className="border-b border-[var(--admin-border)] px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold">{supportCase.title}</p>
            <p className="mt-0.5 truncate text-[11.5px] text-[var(--admin-text-muted)]">
              {(supportCase.department?.name ?? supportCase.teamName)}
              {supportCase.topic ? ` - ${supportCase.topic.name}` : ''}
            </p>
          </div>
          <StatusPill label={statusLabel[supportCase.status]} tone={statusTone[supportCase.status]} />
        </div>
      </div>

      {supportCase.status === 'RESOLVED' ? (
        <div className="border-b border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-2.5">
          {reopenState.canReopen ? (
            <form onSubmit={onReopen} className="grid gap-2">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-[var(--admin-text-primary)]">
                <RotateCcw size={14} />
                Reabrir atendimento
              </div>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)_auto]">
                <select
                  value={reopenReason}
                  onChange={(event) => onReopenReasonChange(event.currentTarget.value as SupportReopenReason)}
                  aria-label="Motivo da reabertura"
                  className="h-9 min-w-0 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-2 text-[12px] text-[var(--admin-text-primary)] outline-none"
                >
                  {reopenReasonOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={reopenMessage}
                  onChange={(event) => onReopenMessageChange(event.currentTarget.value)}
                  aria-label="Mensagem de reabertura"
                  placeholder="Explique o que ainda precisa de retorno"
                  className="h-9 min-w-0 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-2 text-[12px] text-[var(--admin-text-primary)] outline-none placeholder:text-[var(--admin-text-muted)]"
                />
                <button
                  type="submit"
                  disabled={!reopenMessage.trim() || reopenPending}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-[4px] border border-[var(--admin-border-strong)] bg-[var(--admin-panel-active)] px-3 text-[12px] font-semibold text-[var(--admin-text-primary)] disabled:opacity-50"
                >
                  <RotateCcw size={13} />
                  {reopenPending ? 'Reabrindo...' : 'Reabrir'}
                </button>
              </div>
              {reopenError ? <p className="text-[11px] text-[var(--admin-danger-text)]">{reopenError}</p> : null}
            </form>
          ) : (
            <p className="text-[11.5px] leading-5 text-[var(--admin-text-muted)]">
              Este atendimento ja saiu da janela de reabertura. Abra uma nova mensagem se precisar de outro retorno.
            </p>
          )}
        </div>
      ) : null}

      <div className="admin-scrollbar grid max-h-[min(58vh,30rem)] flex-1 content-start gap-2 overflow-y-auto px-3 py-3">
        {supportCase.messages.length > 0 ? supportCase.messages.map((item) => (
          <div
            key={item.id}
            className={cn(
              'max-w-[86%] rounded-[6px] border px-3 py-2 text-[12px]',
              item.mine
                ? 'ml-auto border-[var(--admin-border-strong)] bg-[var(--admin-panel-active)] text-[var(--admin-text-primary)]'
                : 'mr-auto border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)]',
            )}
          >
            <p className="font-semibold text-[10.5px] text-[var(--admin-text-muted)]">{item.senderName}</p>
            <p className="mt-1 whitespace-pre-wrap leading-5">{item.body}</p>
          </div>
        )) : (
          <ContactEmptyState title="Conversa vazia" body="Envie uma mensagem para complementar sua solicitação." compact />
        )}
      </div>

      <form onSubmit={onSubmit} className="border-t border-[var(--admin-border)] p-2.5">
        <label className="flex min-h-9 min-w-0 items-center gap-2 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2.5 py-1">
          <MessageSquareText size={14} className="shrink-0 text-[var(--admin-text-muted)]" />
          <input
            type="text"
            aria-label="Responder atendimento"
            placeholder="Responder..."
            value={message}
            onChange={(event) => onMessageChange(event.currentTarget.value)}
            className="min-w-0 flex-1 bg-transparent text-[12px] text-[var(--admin-text-primary)] outline-none placeholder:text-[var(--admin-text-muted)]"
          />
          <button
            type="submit"
            aria-label="Enviar resposta"
            disabled={!message.trim() || pending}
            className="flex h-7 w-7 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-panel-active)] text-[var(--admin-text-primary)] disabled:opacity-50"
          >
            <Send size={13} />
          </button>
        </label>
        {error ? <p className="mt-1 text-[11px] text-[var(--admin-danger-text)]">{error}</p> : null}
      </form>
    </div>
  );
}

function supportCaseReopenState(supportCase: SupportCaseDetail) {
  if (supportCase.status !== 'RESOLVED' || !supportCase.resolvedAt) {
    return { canReopen: false };
  }

  const resolvedAt = Date.parse(supportCase.resolvedAt);
  const sevenDaysMs = 7 * 86_400_000;

  return { canReopen: Number.isFinite(resolvedAt) && Date.now() - resolvedAt <= sevenDaysMs };
}

function formValuesPayload(
  fields: SupportTopicField[],
  values: DynamicFormValues,
) {
  return fields
    .filter((field) => isDynamicFieldVisible(field, values))
    .map((field) => ({
      fieldId: field.id,
      value: normalizeDynamicFieldValue(values[field.code]),
    }))
    .filter((fieldValue) => fieldValue.value);
}

function validateDynamicSupportForm(fields: SupportTopicField[], values: DynamicFormValues) {
  return fields.reduce<DynamicFormErrors>((errors, field) => {
    if (!isDynamicFieldVisible(field, values) || !isDynamicFieldRequired(field, values)) {
      return errors;
    }

    if (!normalizeDynamicFieldValue(values[field.code])) {
      return {
        ...errors,
        [field.code]: 'Campo obrigatorio.',
      };
    }

    return errors;
  }, {});
}

function isDynamicFieldVisible(field: SupportTopicField, values: DynamicFormValues) {
  return field.visibleWhen ? dynamicConditionsMatch(field.visibleWhen, values) : true;
}

function isDynamicFieldRequired(field: SupportTopicField, values: DynamicFormValues) {
  return field.required || Boolean(field.requiredWhen && dynamicConditionsMatch(field.requiredWhen, values));
}

function dynamicConditionsMatch(conditions: unknown, values: DynamicFormValues) {
  const parsed = objectConditionsOrNull(conditions);

  if (!parsed) {
    return false;
  }

  const mode = Array.isArray(parsed.any) ? 'any' : 'all';
  const source = Array.isArray(parsed[mode]) ? parsed[mode] : [];

  if (source.length === 0) {
    return false;
  }

  return mode === 'any'
    ? source.some((condition) => dynamicConditionClauseMatches(condition, values))
    : source.every((condition) => dynamicConditionClauseMatches(condition, values));
}

function dynamicConditionClauseMatches(condition: unknown, values: DynamicFormValues) {
  const parsed = objectConditionsOrNull(condition);

  if (!parsed || typeof parsed.fieldCode !== 'string') {
    return false;
  }

  const actual = normalizeComparableConditionValue(values[parsed.fieldCode]);
  const operator = parsed.operator ?? 'equals';

  if (operator === 'exists') {
    return actual.length > 0;
  }

  if (operator === 'notEquals') {
    return actual !== normalizeComparableConditionValue(parsed.value);
  }

  if (operator === 'contains') {
    return actual.includes(normalizeComparableConditionValue(parsed.value));
  }

  if (operator === 'in' && Array.isArray(parsed.values)) {
    return parsed.values.map(normalizeComparableConditionValue).includes(actual);
  }

  return actual === normalizeComparableConditionValue(parsed.value);
}

function objectConditionsOrNull(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function normalizeComparableConditionValue(value: unknown) {
  return String(value ?? '').trim().toLocaleLowerCase('pt-BR');
}

function normalizeDynamicFieldValue(value: unknown) {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  return String(value ?? '').trim();
}

function fieldOptions(options: unknown) {
  if (!Array.isArray(options)) {
    return [];
  }

  return options.filter((option): option is string => typeof option === 'string');
}

function ContactEmptyState({ title, body, compact = false }: { title: string; body: string; compact?: boolean }) {
  return (
    <div className={cn('grid place-items-center px-4 text-center', compact ? 'py-6' : 'min-h-[220px] py-10')}>
      <div className="grid justify-items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)]">
          <Stethoscope size={16} />
        </span>
        <div>
          <p className="text-[12.5px] font-semibold text-[var(--admin-text-primary)]">{title}</p>
          <p className="mt-1 max-w-[28rem] text-[11.5px] leading-5 text-[var(--admin-text-muted)]">{body}</p>
        </div>
      </div>
    </div>
  );
}
