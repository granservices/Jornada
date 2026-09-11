export type SessionUser = {
  id: string;
  email: string;
  employeeId: string | null;
  fullName: string;
  roles: string[];
  status: string;
  emailVerifiedAt: string | null;
};

export type SessionApplication = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  entryKind?: 'NATIVE' | 'REDIRECT';
  entryPath: string;
  imageUrl?: string | null;
  isDefault: boolean;
  roles: string[];
};

export type AuthSessionSnapshot = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  user: SessionUser;
  applications?: SessionApplication[];
};

const LOCAL_STORAGE_KEY = 'jornada.auth.session';
const SESSION_STORAGE_KEY = 'jornada.auth.session.temporary';
const CHANGE_EVENT = 'jornada-auth-session-changed';
let cachedRawSnapshot: string | null | undefined;
let cachedParsedSnapshot: AuthSessionSnapshot | null = null;

function isBrowser() {
  return typeof window !== 'undefined';
}

function parseSnapshot(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as AuthSessionSnapshot;
  } catch {
    return null;
  }
}

function getParsedSnapshot(rawSnapshot: string | null) {
  if (rawSnapshot === cachedRawSnapshot) {
    return cachedParsedSnapshot;
  }

  cachedRawSnapshot = rawSnapshot;
  cachedParsedSnapshot = parseSnapshot(rawSnapshot);
  return cachedParsedSnapshot;
}

function readSnapshotFromStorage() {
  if (!isBrowser()) {
    return null;
  }

  const persistentSnapshot = window.localStorage.getItem(LOCAL_STORAGE_KEY);

  if (persistentSnapshot) {
    return getParsedSnapshot(persistentSnapshot);
  }

  const temporarySnapshot = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  return getParsedSnapshot(temporarySnapshot);
}

function emitChange() {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function getAuthSessionSnapshot() {
  return readSnapshotFromStorage();
}

export function persistAuthSession(
  snapshot: AuthSessionSnapshot,
  options?: { persistent?: boolean },
) {
  if (!isBrowser()) {
    return;
  }

  const serialized = JSON.stringify(snapshot);
  const persistent = options?.persistent ?? true;

  if (persistent) {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, serialized);
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } else {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, serialized);
    window.localStorage.removeItem(LOCAL_STORAGE_KEY);
  }

  emitChange();
}

export function clearAuthSession() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(LOCAL_STORAGE_KEY);
  window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  emitChange();
}

export function subscribeAuthSession(listener: () => void) {
  if (!isBrowser()) {
    return () => undefined;
  }

  const onStorage = (event: StorageEvent) => {
    if (
      event.key === LOCAL_STORAGE_KEY ||
      event.key === SESSION_STORAGE_KEY ||
      event.key === null
    ) {
      listener();
    }
  };

  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener('storage', onStorage);

  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener('storage', onStorage);
  };
}
