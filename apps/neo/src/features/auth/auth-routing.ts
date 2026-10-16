type AuthenticatedUserLike = {
  roles: string[];
} | null | undefined;

type SessionApplicationRouteLike = {
  code: string;
  entryPath: string;
  isDefault?: boolean;
} | null | undefined;

const supportOperatorRoles = ['ADMIN', 'SUPPORT', 'TI', 'MEDICINE', 'OPERATIONS'];

export function isSupportOperatorUser(user: AuthenticatedUserLike) {
  return Boolean(user?.roles.some((role) => supportOperatorRoles.includes(role)));
}

export function hasApplicationAccess(
  applications: Array<{ code: string } | null | undefined> | null | undefined,
  applicationCode: string,
) {
  return Boolean(applications?.some((application) => application?.code === applicationCode));
}

export function defaultRouteForAuthenticatedUser(
  user: AuthenticatedUserLike,
  applications?: SessionApplicationRouteLike[] | null,
) {
  const activeApplications = applications?.filter(
    (application): application is NonNullable<SessionApplicationRouteLike> =>
      Boolean(application?.code && application.entryPath),
  ) ?? [];

  if (activeApplications.length > 1) {
    return '/aplicativos';
  }

  if (activeApplications.length === 1) {
    return activeApplications[0].entryPath;
  }

  if (isSupportOperatorUser(user)) {
    return '/atendimentos?fila=nao-atribuidos';
  }

  return '/inbox';
}
