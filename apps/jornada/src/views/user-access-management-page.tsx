import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, KeyRound, Pencil, UserPlus, UserRound, X } from 'lucide-react';
import { Checkbox } from 'react-aria-components/Checkbox';
import { Button } from '../components/ui/button';
import { SearchField } from '../components/ui/search-field';
import { SectionCard } from '../components/ui/section-card';
import { TextField } from '../components/ui/text-field';
import {
  listManagedApplications,
  listManagedUsers,
  createAdministrativeInvitation,
  setManagedUserApplicationAccess,
  type ContextualApplicationRoleCode,
  type ManagedUser,
} from '../features/auth/applications-admin-api';
import { useAuthSession } from '../features/auth/use-auth-session';
import { cn } from '../lib/cn';

const applicationRolesByModule: Record<string, Array<{ code: ContextualApplicationRoleCode; label: string }>> = {
  JORNADA: [
    { code: 'MEMBER', label: 'Colaborador' },
    { code: 'MANAGER', label: 'Gestor' },
  ],
  HELP_HUB: [
    { code: 'REQUESTER', label: 'Solicitante' },
    { code: 'AGENT', label: 'Atendente' },
    { code: 'MANAGER', label: 'Gestor' },
  ],
  QUICK_FORMS: [
    { code: 'VIEWER', label: 'Leitor' },
    { code: 'AUTHOR', label: 'Autor' },
    { code: 'PUBLISHER', label: 'Publicador' },
    { code: 'MANAGER', label: 'Gestor' },
  ],
};

export function UserAccessManagementPage() {
  const session = useAuthSession();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editingApplicationCode, setEditingApplicationCode] = useState<string | null>(null);
  const [draftRoles, setDraftRoles] = useState<ContextualApplicationRoleCode[]>([]);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteEmployeeId, setInviteEmployeeId] = useState('');
  const [inviteApplicationCodes, setInviteApplicationCodes] = useState<string[]>([]);
  const canManage = Boolean(session?.user.roles.includes('ADMIN'));
  const usersQuery = useQuery({
    queryKey: ['auth', 'users', 'application-access', searchTerm],
    queryFn: () => listManagedUsers(searchTerm),
    enabled: canManage,
  });
  const applicationsQuery = useQuery({
    queryKey: ['auth', 'applications', 'admin'],
    queryFn: listManagedApplications,
    enabled: canManage,
  });
  const users = usersQuery.data?.items ?? [];
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null;
  const activeApplications = useMemo(
    () => (applicationsQuery.data?.items ?? []).filter((application) => application.status === 'ACTIVE'),
    [applicationsQuery.data?.items],
  );

  useEffect(() => {
    if (!selectedUserId && users[0]) {
      setSelectedUserId(users[0].id);
    }
  }, [selectedUserId, users]);

  const accessMutation = useMutation({
    mutationFn: ({
      user,
      applicationCode,
      enabled,
      roles,
    }: {
      user: ManagedUser;
      applicationCode: string;
      enabled: boolean;
      roles?: ContextualApplicationRoleCode[];
    }) => {
      const currentAccess = user.applications.find((application) => application.code === applicationCode);

      return setManagedUserApplicationAccess(user.id, applicationCode, {
        enabled,
        isDefault: enabled ? currentAccess?.isDefault ?? user.applications.length === 0 : false,
        roles: enabled
          ? roles ?? currentAccess?.roles ?? [applicationRolesByModule[applicationCode]?.[0]?.code ?? 'MEMBER']
          : [],
      });
    },
    onSuccess: () => {
      setEditingApplicationCode(null);
      void queryClient.invalidateQueries({ queryKey: ['auth', 'users', 'application-access'] });
    },
  });

  const invitationMutation = useMutation({
    mutationFn: () =>
      createAdministrativeInvitation({
        fullName: inviteFullName,
        email: inviteEmail,
        employeeId: inviteEmployeeId.trim() || undefined,
        reason: 'ONBOARDING',
        applications: inviteApplicationCodes.map((code, index) => ({
          code,
          roles: [applicationRolesByModule[code]?.[0]?.code ?? 'MEMBER'],
          isDefault: index === 0,
        })),
      }),
    onSuccess: () => {
      setIsInviting(false);
      setInviteFullName('');
      setInviteEmail('');
      setInviteEmployeeId('');
      setInviteApplicationCodes([]);
      void queryClient.invalidateQueries({ queryKey: ['auth', 'users', 'application-access'] });
    },
  });

  function startRoleEditing(applicationCode: string, roles: ContextualApplicationRoleCode[]) {
    setEditingApplicationCode(applicationCode);
    setDraftRoles(roles);
  }

  function toggleRole(role: ContextualApplicationRoleCode) {
    setDraftRoles((current) =>
      current.includes(role)
        ? current.filter((item) => item !== role)
        : [...current, role],
    );
  }

  function toggleInvitationApplication(code: string, selected: boolean) {
    setInviteApplicationCodes((current) =>
      selected ? [...current, code] : current.filter((item) => item !== code),
    );
  }

  if (!canManage) {
    return null;
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-3">
      <section className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-text-muted)]">
            Administração global
          </p>
          <h2 className="mt-1 text-[15px] font-semibold text-[var(--admin-text-primary)]">Usuarios e acessos</h2>
        </div>
        <Button type="button" variant="secondary" className="h-8 min-h-8 px-2.5 text-[11px]" onPress={() => setIsInviting((current) => !current)}>
          <UserPlus size={13} />
          Convidar usuario
        </Button>
      </section>

      {isInviting ? (
        <SectionCard className="p-4">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--admin-border)] pb-3">
            <div>
              <h3 className="text-[13px] font-semibold text-[var(--admin-text-primary)]">Novo convite</h3>
              <p className="mt-0.5 text-[11px] text-[var(--admin-text-secondary)]">O acesso so sera criado para os modulos selecionados.</p>
            </div>
            <Button type="button" variant="ghost" aria-label="Fechar convite" className="h-8 min-h-8 px-2" onPress={() => setIsInviting(false)}>
              <X size={14} />
            </Button>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <TextField label="Nome completo" value={inviteFullName} onChange={setInviteFullName} />
            <TextField label="Email" type="email" value={inviteEmail} onChange={setInviteEmail} />
            <TextField label="Matricula" value={inviteEmployeeId} onChange={setInviteEmployeeId} />
          </div>
          <div className="mt-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-muted)]">Modulos autorizados</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {activeApplications.map((application) => (
                <Checkbox
                  key={application.code}
                  isSelected={inviteApplicationCodes.includes(application.code)}
                  onChange={(selected) => toggleInvitationApplication(application.code, selected)}
                  className="group flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2 text-[10px] font-semibold text-[var(--admin-text-secondary)] outline-none transition hover:bg-[var(--admin-surface-3)] data-[selected]:border-[var(--admin-border-strong)] data-[selected]:bg-[var(--admin-panel-active)] data-[selected]:text-[var(--admin-text-primary)] data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--focus-ring)]"
                >
                  {({ isSelected }) => (
                    <>
                      <span className="flex h-3.5 w-3.5 items-center justify-center rounded-[2px] border border-current">
                        {isSelected ? <Check size={10} strokeWidth={3} /> : null}
                      </span>
                      {application.name}
                    </>
                  )}
                </Checkbox>
              ))}
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              className="h-8 min-h-8 px-2.5 text-[11px]"
              isDisabled={invitationMutation.isPending || !inviteFullName.trim() || !inviteEmail.trim() || inviteApplicationCodes.length === 0}
              onPress={() => invitationMutation.mutate()}
            >
              <UserPlus size={13} />
              Enviar convite
            </Button>
          </div>
        </SectionCard>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[minmax(17rem,0.85fr)_minmax(0,1.35fr)]">
        <SectionCard className="min-w-0 p-3">
          <SearchField
            aria-label="Buscar usuarios"
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Nome, email ou matricula"
          />
          <div className="mt-3 grid gap-1">
            {usersQuery.isLoading ? <p className="p-2 text-[12px] text-[var(--admin-text-secondary)]">Carregando usuarios...</p> : null}
            {users.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => setSelectedUserId(user.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-[4px] px-2.5 py-2 text-left outline-none transition hover:bg-[var(--admin-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]',
                  selectedUser?.id === user.id && 'bg-[var(--admin-panel-active)]',
                )}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)]"><UserRound size={14} /></span>
                <span className="min-w-0">
                  <span className="block truncate text-[12px] font-semibold text-[var(--admin-text-primary)]">{user.fullName}</span>
                  <span className="block truncate text-[10px] text-[var(--admin-text-secondary)]">{user.email}</span>
                </span>
              </button>
            ))}
            {!usersQuery.isLoading && users.length === 0 ? <p className="p-2 text-[12px] text-[var(--admin-text-secondary)]">Nenhum usuario encontrado.</p> : null}
          </div>
        </SectionCard>

        <SectionCard className="min-w-0 p-4">
          {selectedUser ? (
            <>
              <div className="flex items-start justify-between gap-3 border-b border-[var(--admin-border)] pb-3">
                <div>
                  <h3 className="text-[13px] font-semibold text-[var(--admin-text-primary)]">{selectedUser.fullName}</h3>
                  <p className="mt-0.5 text-[11px] text-[var(--admin-text-secondary)]">{selectedUser.email}{selectedUser.employeeId ? ` · ${selectedUser.employeeId}` : ''}</p>
                </div>
                <span className="rounded-full border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-secondary)]">{userStatusLabel(selectedUser.status)}</span>
              </div>
              <div className="mt-3 grid gap-2">
                {activeApplications.map((application) => {
                  const access = selectedUser.applications.find((item) => item.code === application.code);
                  const enabled = Boolean(access);
                  const pending = accessMutation.isPending && accessMutation.variables?.applicationCode === application.code;
                  const isEditingRoles = editingApplicationCode === application.code;
                  const applicationRoles = applicationRolesByModule[application.code] ?? [];

                  return (
                    <div key={application.code} className="rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-semibold text-[var(--admin-text-primary)]">{application.name}</p>
                          <p className="mt-0.5 truncate text-[10px] text-[var(--admin-text-secondary)]">{enabled ? access?.roles.join(', ') || 'Sem papel contextual' : 'Sem acesso'}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {enabled ? (
                            <Button
                              type="button"
                              variant="ghost"
                              aria-label={`Editar papeis de ${application.name}`}
                              className="h-8 min-h-8 rounded-[4px] px-2 text-[11px]"
                              onPress={() => startRoleEditing(application.code, access?.roles ?? [])}
                            >
                              <Pencil size={13} />
                              <span className="hidden sm:inline">Editar papeis</span>
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant={enabled ? 'ghost' : 'secondary'}
                            isDisabled={pending}
                            className="h-8 min-h-8 rounded-[4px] px-2.5 text-[11px]"
                            onPress={() => accessMutation.mutate({ user: selectedUser, applicationCode: application.code, enabled: !enabled })}
                          >
                            <KeyRound size={13} />
                            {enabled ? 'Revogar' : 'Conceder'}
                          </Button>
                        </div>
                      </div>
                      {enabled && isEditingRoles ? (
                        <div className="mt-3 border-t border-[var(--admin-border)] pt-3">
                          <div className="flex flex-wrap gap-2" aria-label={`Papeis no ${application.name}`}>
                            {applicationRoles.map((role) => (
                              <Checkbox
                                key={role.code}
                                isSelected={draftRoles.includes(role.code)}
                                onChange={() => toggleRole(role.code)}
                                className="group flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-2 text-[10px] font-semibold text-[var(--admin-text-secondary)] outline-none transition hover:bg-[var(--admin-surface-3)] data-[selected]:border-[var(--admin-border-strong)] data-[selected]:bg-[var(--admin-panel-active)] data-[selected]:text-[var(--admin-text-primary)] data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--focus-ring)]"
                              >
                                {({ isSelected }) => (
                                  <>
                                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-[2px] border border-current">
                                      {isSelected ? <Check size={10} strokeWidth={3} /> : null}
                                    </span>
                                    {role.label}
                                  </>
                                )}
                              </Checkbox>
                            ))}
                          </div>
                          <div className="mt-3 flex items-center justify-end gap-2">
                            <Button type="button" variant="ghost" className="h-8 min-h-8 px-2.5 text-[11px]" onPress={() => setEditingApplicationCode(null)}>
                              <X size={13} />
                              Cancelar
                            </Button>
                            <Button
                              type="button"
                              className="h-8 min-h-8 px-2.5 text-[11px]"
                              isDisabled={draftRoles.length === 0 || pending}
                              onPress={() => accessMutation.mutate({ user: selectedUser, applicationCode: application.code, enabled: true, roles: draftRoles })}
                            >
                              Salvar papeis
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </>
          ) : <p className="text-[12px] text-[var(--admin-text-secondary)]">Selecione um usuario para gerenciar os acessos.</p>}
        </SectionCard>
      </div>
    </main>
  );
}

function userStatusLabel(status: ManagedUser['status']) {
  if (status === 'PENDING') {
    return 'Convite pendente';
  }
  if (status === 'BLOCKED') {
    return 'Bloqueado';
  }

  return status === 'DISABLED' ? 'Desativado' : 'Ativo';
}
