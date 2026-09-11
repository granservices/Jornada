import { apiFetch } from '../api/api-client';

export type ManagedApplication = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  entryKind: 'NATIVE' | 'REDIRECT';
  entryPath: string;
  imageUrl: string | null;
  sortOrder: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
};

export type ApplicationCatalogPayload = {
  name: string;
  description?: string;
  entryKind: ManagedApplication['entryKind'];
  entryPath: string;
  imageUrl?: string | null;
  sortOrder: number;
  status: ManagedApplication['status'];
};

export async function listManagedApplications() {
  return apiFetch<{ items: ManagedApplication[] }>('/auth/admin/applications');
}

export async function createManagedApplication(
  code: string,
  payload: ApplicationCatalogPayload,
) {
  return apiFetch<{ item: ManagedApplication }>('/auth/admin/applications', {
    method: 'POST',
    body: JSON.stringify({ code, ...payload }),
  });
}

export async function updateManagedApplication(
  code: string,
  payload: ApplicationCatalogPayload,
) {
  return apiFetch<{ item: ManagedApplication }>(
    `/auth/admin/applications/${encodeURIComponent(code)}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );
}

export type ManagedUserApplicationAccess = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  entryPath: string;
  status: 'ACTIVE' | 'INACTIVE';
  isDefault: boolean;
  roles: ContextualApplicationRoleCode[];
};

export type ContextualApplicationRoleCode =
  | 'MEMBER'
  | 'REQUESTER'
  | 'AGENT'
  | 'MANAGER'
  | 'VIEWER'
  | 'AUTHOR'
  | 'PUBLISHER';

export type ManagedUser = {
  id: string;
  email: string;
  status: 'PENDING' | 'ACTIVE' | 'BLOCKED' | 'DISABLED';
  globalRoles: string[];
  fullName: string;
  employeeId: string | null;
  createdAt: string;
  updatedAt: string;
  applications: ManagedUserApplicationAccess[];
};

export async function listManagedUsers(searchTerm = '') {
  const params = new URLSearchParams({ limit: '50' });

  if (searchTerm.trim()) {
    params.set('q', searchTerm.trim());
  }

  return apiFetch<{ items: ManagedUser[] }>(
    `/auth/admin/users/application-access?${params.toString()}`,
  );
}

export async function setManagedUserApplicationAccess(
  userId: string,
  applicationCode: string,
  payload: {
    enabled: boolean;
    isDefault?: boolean;
    roles: ContextualApplicationRoleCode[];
  },
) {
  return apiFetch<{ item: ManagedUser }>(
    `/auth/admin/users/${encodeURIComponent(userId)}/applications/${encodeURIComponent(applicationCode)}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );
}

export type AdministrativeInvitationPayload = {
  email: string;
  fullName: string;
  employeeId?: string;
  reason: 'ONBOARDING' | 'ROLE_CHANGE' | 'SECURITY' | 'OFFBOARDING' | 'ACCESS_CORRECTION' | 'OTHER';
  reasonComment?: string;
  applications: Array<{
    code: string;
    roles: ContextualApplicationRoleCode[];
    isDefault?: boolean;
  }>;
};

export async function createAdministrativeInvitation(
  payload: AdministrativeInvitationPayload,
) {
  return apiFetch<{
    item: {
      invitationId: string;
      userId: string;
      email: string;
      status: 'PENDING';
      deliveryStatus: 'QUEUED';
      expiresAt: string;
    };
  }>('/auth/admin/users/invitations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
