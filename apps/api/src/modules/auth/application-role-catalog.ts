import type { ApplicationRoleCode } from '@prisma/client';

export const APPLICATION_ROLE_CATALOG = {
  JORNADA: ['MEMBER', 'MANAGER'],
  HELP_HUB: ['REQUESTER', 'AGENT', 'MANAGER'],
  QUICK_FORMS: ['VIEWER', 'AUTHOR', 'PUBLISHER', 'MANAGER'],
} as const satisfies Record<string, readonly ApplicationRoleCode[]>;

export type ManagedApplicationCode = keyof typeof APPLICATION_ROLE_CATALOG;

export function areValidApplicationRoles(
  applicationCode: string,
  roles: readonly string[],
) {
  const allowed = APPLICATION_ROLE_CATALOG[
    applicationCode as ManagedApplicationCode
  ];

  return Boolean(allowed && roles.length > 0 && roles.every((role) => allowed.includes(role as never)));
}
