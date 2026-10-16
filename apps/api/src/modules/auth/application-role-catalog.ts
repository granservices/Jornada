import type { ApplicationRoleCode } from '@prisma/client';

export const APPLICATION_ROLE_CATALOG = {
  NEO: ['MEMBER', 'MANAGER'],
  JORNADA: ['MEMBER', 'MANAGER'],
  TICKETS: ['REQUESTER', 'AGENT', 'MANAGER'],
  QUICK_FORMS: ['VIEWER', 'AUTHOR', 'PUBLISHER', 'MANAGER'],
} as const satisfies Record<string, readonly ApplicationRoleCode[]>;

export type ManagedApplicationCode = keyof typeof APPLICATION_ROLE_CATALOG;

export const DEFAULT_APPLICATION_ROLES = ['MEMBER', 'MANAGER'] as const satisfies readonly ApplicationRoleCode[];

export function getAllowedApplicationRoles(applicationCode: string) {
  return (
    APPLICATION_ROLE_CATALOG[applicationCode as ManagedApplicationCode] ??
    DEFAULT_APPLICATION_ROLES
  );
}

export function areValidApplicationRoles(
  applicationCode: string,
  roles: readonly string[],
) {
  const allowed = getAllowedApplicationRoles(applicationCode);

  return roles.length > 0 && roles.every((role) => allowed.includes(role as never));
}
