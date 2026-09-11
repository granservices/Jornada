type CentralLoginApplicationCode = 'HELP_HUB' | 'QUICK_FORMS';

export type CentralLoginIntent = {
  applicationCode: CentralLoginApplicationCode;
  entryPath: string;
};

const intentStorageKey = 'jornada.central-login.intent';

export function parseCentralLoginIntent(search: string): CentralLoginIntent | null {
  const parameters = new URLSearchParams(search);
  const applicationCode = parameters.get('app');
  const entryPath = parameters.get('returnTo');

  if (
    (applicationCode !== 'HELP_HUB' && applicationCode !== 'QUICK_FORMS') ||
    !entryPath ||
    !isAllowedEntryPath(applicationCode, entryPath)
  ) {
    return null;
  }

  return { applicationCode, entryPath };
}

export function persistCentralLoginIntent(intent: CentralLoginIntent | null) {
  if (!intent || typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(intentStorageKey, JSON.stringify(intent));
}

export function readCentralLoginIntent() {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawIntent = window.sessionStorage.getItem(intentStorageKey);

  if (!rawIntent) {
    return null;
  }

  try {
    const parsedIntent = JSON.parse(rawIntent) as Partial<CentralLoginIntent> | null;

    if (!parsedIntent || typeof parsedIntent.applicationCode !== 'string' || typeof parsedIntent.entryPath !== 'string') {
      return null;
    }

    return isAllowedEntryPath(parsedIntent.applicationCode, parsedIntent.entryPath)
      ? (parsedIntent as CentralLoginIntent)
      : null;
  } catch {
    return null;
  }
}

export function clearCentralLoginIntent() {
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(intentStorageKey);
  }
}

function isAllowedEntryPath(
  applicationCode: CentralLoginApplicationCode,
  entryPath: string,
) {
  if (!entryPath.startsWith('/') || entryPath.startsWith('//')) {
    return false;
  }

  return applicationCode === 'HELP_HUB'
    ? entryPath.startsWith('/atendimentos')
    : entryPath.startsWith('/formularios');
}
