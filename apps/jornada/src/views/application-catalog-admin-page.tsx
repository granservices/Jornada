import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppWindow, ExternalLink, Image, Pencil, Plus, Route, Save } from 'lucide-react';
import { Button } from '../components/ui/button';
import { SearchField } from '../components/ui/search-field';
import { SectionCard } from '../components/ui/section-card';
import {
  createManagedApplication,
  listManagedApplications,
  updateManagedApplication,
  type ApplicationCatalogPayload,
  type ManagedApplication,
} from '../features/auth/applications-admin-api';
import { useAuthSession } from '../features/auth/use-auth-session';
import { cn } from '../lib/cn';

type ApplicationDraft = ApplicationCatalogPayload & { code: string };

const emptyDraft: ApplicationDraft = {
  code: '',
  name: '',
  description: '',
  entryKind: 'NATIVE',
  entryPath: '/',
  imageUrl: '',
  sortOrder: 100,
  status: 'ACTIVE',
};

const inputClassName =
  'h-9 w-full rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2.5 text-[12px] text-[var(--admin-text-primary)] outline-none placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-border-strong)] disabled:cursor-not-allowed disabled:opacity-60';
const labelClassName =
  'text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-text-muted)]';

export function ApplicationCatalogAdminPage() {
  const session = useAuthSession();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [draft, setDraft] = useState<ApplicationDraft>(emptyDraft);
  const canManage = Boolean(session?.user.roles.includes('ADMIN'));
  const applicationsQuery = useQuery({
    queryKey: ['auth', 'applications', 'admin'],
    queryFn: listManagedApplications,
    enabled: canManage,
  });
  const applications = applicationsQuery.data?.items ?? [];
  const selectedApplication = applications.find(
    (application) => application.code === selectedCode,
  );
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('pt-BR');
  const filteredApplications = useMemo(
    () =>
      applications.filter((application) =>
        [application.code, application.name, application.description ?? ''].some((value) =>
          value.toLocaleLowerCase('pt-BR').includes(normalizedSearch),
        ),
      ),
    [applications, normalizedSearch],
  );

  useEffect(() => {
    if (!selectedApplication) {
      return;
    }

    setDraft(toDraft(selectedApplication));
  }, [selectedApplication]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = toPayload(draft);

      if (selectedApplication) {
        return updateManagedApplication(selectedApplication.code, payload);
      }

      return createManagedApplication(draft.code.trim(), payload);
    },
    onSuccess: ({ item }) => {
      void queryClient.invalidateQueries({ queryKey: ['auth', 'applications'] });
      setSelectedCode(item.code);
    },
  });

  function startCreate() {
    setSelectedCode(null);
    setDraft(emptyDraft);
    saveMutation.reset();
  }

  function selectApplication(application: ManagedApplication) {
    setSelectedCode(application.code);
    setDraft(toDraft(application));
    saveMutation.reset();
  }

  function updateDraft<Key extends keyof ApplicationDraft>(
    key: Key,
    value: ApplicationDraft[Key],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveMutation.mutate();
  }

  if (!session) {
    return null;
  }

  if (!canManage) {
    return (
      <main className="w-full">
        <SectionCard className="p-4">
          <p className="text-[13px] font-semibold">Gestao restrita</p>
          <p className="mt-1 text-[12px] text-[var(--admin-text-secondary)]">
            Apenas administradores globais podem manter o catalogo de aplicativos.
          </p>
        </SectionCard>
      </main>
    );
  }

  return (
    <main className="grid w-full gap-3">
      <section className="flex flex-wrap items-center justify-between gap-2 rounded-[3px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-2.5 shadow-[var(--admin-shadow)]">
        <SearchField
          aria-label="Buscar aplicativos no catalogo"
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar por nome, codigo ou descricao"
          appearance="compact"
          className="w-full sm:max-w-sm"
        />
        <Button onPress={startCreate} className="min-h-8 px-2.5 text-[10.5px]">
          <Plus size={14} aria-hidden="true" />
          Nova aplicacao
        </Button>
      </section>

      {applicationsQuery.isError ? (
        <SectionCard className="border-[var(--admin-danger-border)] bg-[var(--admin-danger-bg)] p-3">
          <p className="text-[12px] font-semibold text-[var(--admin-danger-text)]">
            Nao foi possivel carregar o catalogo.
          </p>
          <p className="mt-1 text-[11px] text-[var(--admin-danger-text)]">
            {applicationsQuery.error.message}
          </p>
        </SectionCard>
      ) : null}

      <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
        <SectionCard className="overflow-hidden p-0">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-[var(--admin-border)] px-3 py-2.5">
            <div>
              <h2 className="text-[13px] font-semibold">Aplicativos</h2>
              <p className="mt-0.5 text-[11px] text-[var(--admin-text-secondary)]">
                {applications.length} no catalogo
              </p>
            </div>
          </div>
          {applicationsQuery.isLoading ? (
            <p className="p-3 text-[12px] text-[var(--admin-text-secondary)]">Carregando aplicativos...</p>
          ) : null}
          {!applicationsQuery.isLoading && filteredApplications.length === 0 ? (
            <p className="p-3 text-[12px] text-[var(--admin-text-secondary)]">Nenhum aplicativo encontrado.</p>
          ) : null}
          <div className="divide-y divide-[var(--admin-border)]">
            {filteredApplications.map((application) => (
              <button
                key={application.id}
                type="button"
                onClick={() => selectApplication(application)}
                className={cn(
                  'grid w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 text-left transition hover:bg-[var(--admin-surface-2)] focus:outline-none focus-visible:bg-[var(--admin-panel-active)]',
                  selectedApplication?.id === application.id && 'bg-[var(--admin-panel-active)]',
                )}
              >
                <ApplicationThumbnail application={application} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-[12px] font-semibold">{application.name}</span>
                    <CatalogBadge value={application.entryKind} />
                    {application.status === 'INACTIVE' ? <CatalogBadge value="INACTIVE" /> : null}
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-[var(--admin-text-secondary)]">
                    {application.description ?? application.entryPath}
                  </p>
                </div>
                <Pencil size={14} aria-hidden="true" className="text-[var(--admin-text-muted)]" />
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard className="p-3">
          <form onSubmit={submit} className="grid gap-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[13px] font-semibold">
                  {selectedApplication ? 'Editar aplicacao' : 'Nova aplicacao'}
                </h2>
                <p className="mt-0.5 text-[11px] text-[var(--admin-text-secondary)]">
                  {selectedApplication
                    ? 'O codigo identifica acessos ja concedidos e nao pode ser alterado.'
                    : 'Defina o destino que aparecera para usuarios autorizados.'}
                </p>
              </div>
              <ApplicationThumbnail
                application={{ name: draft.name, imageUrl: draft.imageUrl ?? null }}
              />
            </div>

            <Field label="Codigo">
              <input
                value={draft.code}
                onChange={(event) => updateDraft('code', event.currentTarget.value.toUpperCase())}
                disabled={Boolean(selectedApplication)}
                required
                maxLength={49}
                pattern="[A-Z][A-Z0-9_]{2,48}"
                placeholder="EXEMPLO_APP"
                className={inputClassName}
              />
            </Field>
            <Field label="Nome">
              <input
                value={draft.name}
                onChange={(event) => updateDraft('name', event.currentTarget.value)}
                required
                maxLength={80}
                placeholder="Nome do aplicativo"
                className={inputClassName}
              />
            </Field>
            <Field label="Descricao">
              <textarea
                value={draft.description ?? ''}
                onChange={(event) => updateDraft('description', event.currentTarget.value)}
                maxLength={240}
                rows={3}
                placeholder="O que o usuario encontra neste aplicativo"
                className="min-h-20 w-full resize-y rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2.5 py-2 text-[12px] text-[var(--admin-text-primary)] outline-none placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-border-strong)]"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tipo de destino">
                <select
                  value={draft.entryKind}
                  onChange={(event) =>
                    updateDraft('entryKind', event.currentTarget.value as ApplicationDraft['entryKind'])
                  }
                  className={inputClassName}
                >
                  <option value="NATIVE">Nativa</option>
                  <option value="REDIRECT">Redirecionamento</option>
                </select>
              </Field>
              <Field label="Ordem">
                <input
                  type="number"
                  min="0"
                  max="9999"
                  value={draft.sortOrder}
                  onChange={(event) => updateDraft('sortOrder', Number(event.currentTarget.value))}
                  className={inputClassName}
                />
              </Field>
            </div>
            <Field label={draft.entryKind === 'NATIVE' ? 'Rota interna' : 'URL de redirecionamento'}>
              <input
                value={draft.entryPath}
                onChange={(event) => updateDraft('entryPath', event.currentTarget.value)}
                required
                placeholder={draft.entryKind === 'NATIVE' ? '/meu-app' : 'https://app.exemplo.com'}
                className={inputClassName}
              />
            </Field>
            <Field label="Imagem (URL ou caminho local)">
              <div className="relative">
                <Image size={14} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)]" />
                <input
                  value={draft.imageUrl ?? ''}
                  onChange={(event) => updateDraft('imageUrl', event.currentTarget.value)}
                  maxLength={2048}
                  placeholder="https://... ou /imagem.png"
                  className={`${inputClassName} pl-8`}
                />
              </div>
            </Field>
            <label className="flex items-center gap-2 text-[12px] text-[var(--admin-text-secondary)]">
              <input
                type="checkbox"
                checked={draft.status === 'ACTIVE'}
                onChange={(event) => updateDraft('status', event.currentTarget.checked ? 'ACTIVE' : 'INACTIVE')}
                className="h-4 w-4 rounded border-[var(--admin-border)] accent-[var(--admin-panel-active)]"
              />
              Aplicacao ativa no Hub
            </label>
            {saveMutation.isError ? (
              <p className="text-[11px] text-[var(--admin-danger-text)]">{saveMutation.error.message}</p>
            ) : null}
            <Button type="submit" isDisabled={saveMutation.isPending} className="min-h-9">
              <Save size={14} aria-hidden="true" />
              {saveMutation.isPending ? 'Salvando...' : 'Salvar aplicacao'}
            </Button>
          </form>
        </SectionCard>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className={labelClassName}>{label}</span>
      {children}
    </label>
  );
}

function ApplicationThumbnail({ application }: { application: Pick<ManagedApplication, 'name' | 'imageUrl'> }) {
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[3px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)]">
      {application.imageUrl ? (
        <img src={application.imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <AppWindow size={17} aria-hidden="true" className="text-[var(--admin-text-muted)]" />
      )}
    </span>
  );
}

function CatalogBadge({ value }: { value: ManagedApplication['entryKind'] | 'INACTIVE' }) {
  const isRedirect = value === 'REDIRECT';
  const isInactive = value === 'INACTIVE';
  const Icon = isRedirect ? ExternalLink : isInactive ? AppWindow : Route;
  const label = isRedirect ? 'Redirecionamento' : isInactive ? 'Inativa' : 'Nativa';

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--admin-border)] bg-[var(--admin-surface-3)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-secondary)]">
      <Icon size={10} aria-hidden="true" />
      {label}
    </span>
  );
}

function toDraft(application: ManagedApplication): ApplicationDraft {
  return {
    code: application.code,
    name: application.name,
    description: application.description ?? '',
    entryKind: application.entryKind,
    entryPath: application.entryPath,
    imageUrl: application.imageUrl ?? '',
    sortOrder: application.sortOrder,
    status: application.status,
  };
}

function toPayload(draft: ApplicationDraft): ApplicationCatalogPayload {
  return {
    name: draft.name.trim(),
    description: draft.description?.trim() || undefined,
    entryKind: draft.entryKind,
    entryPath: draft.entryPath.trim(),
    imageUrl: draft.imageUrl?.trim() || null,
    sortOrder: draft.sortOrder,
    status: draft.status,
  };
}
