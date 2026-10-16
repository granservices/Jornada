import {
  clearAuthSession,
  getAuthSessionSnapshot,
  replaceAuthSession,
  type AuthSessionSnapshot,
} from '../auth/auth-session';

const DEFAULT_API_BASE_URL = 'http://localhost:3004/api';

type ApiErrorBody = {
  message?: string | string[];
};

let refreshRequest: Promise<AuthSessionSnapshot> | null = null;

export function getApiBaseUrl() {
  const rawValue = import.meta.env.VITE_API_BASE_URL;
  return rawValue && rawValue.length > 0 ? rawValue : DEFAULT_API_BASE_URL;
}

export function getRealtimeBaseUrl() {
  const explicitValue = import.meta.env.VITE_REALTIME_BASE_URL;

  if (explicitValue && explicitValue.length > 0) {
    return explicitValue;
  }

  return getApiBaseUrl().replace(/\/api\/?$/, '');
}

export async function apiFetch<TResponse>(
  path: string,
  options: RequestInit = {},
): Promise<TResponse> {
  const session = getAuthSessionSnapshot();
  let response = await requestWithSession(path, options, session?.accessToken);

  if (response.status === 401 && session?.refreshToken) {
    try {
      const refreshedSession = await refreshAuthSession(session.refreshToken);
      response = await requestWithSession(path, options, refreshedSession.accessToken);
    } catch {
      clearAuthSession();
      throw new Error('Sessao expirada. Entre novamente.');
    }
  }

  if (!response.ok) {
    const errorMessage = await readApiError(response);

    if (response.status === 401) {
      clearAuthSession();
    }

    throw new Error(errorMessage);
  }

  return (await response.json()) as TResponse;
}

async function requestWithSession(
  path: string,
  options: RequestInit,
  accessToken?: string,
) {
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  try {
    return await fetch(`${getApiBaseUrl()}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error('Nao foi possivel conectar com a API do Jornada.');
  }
}

async function refreshAuthSession(refreshToken: string) {
  refreshRequest ??= requestSessionRefresh(refreshToken).finally(() => {
    refreshRequest = null;
  });

  return refreshRequest;
}

async function requestSessionRefresh(refreshToken: string) {
  let response: Response;

  try {
    response = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    throw new Error('Nao foi possivel conectar com a API do Jornada.');
  }

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const nextSession = (await response.json()) as AuthSessionSnapshot;
  replaceAuthSession(nextSession);
  return nextSession;
}

async function readApiError(response: Response) {
  let errorMessage = 'Nao foi possivel concluir a acao agora.';

  try {
    const body = (await response.json()) as ApiErrorBody;
    if (Array.isArray(body.message)) {
      errorMessage = body.message[0] ?? errorMessage;
    } else if (body.message) {
      errorMessage = body.message;
    }
  } catch {
    // Keep the fallback message when the API does not return JSON.
  }

  return errorMessage;
}
