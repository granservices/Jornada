import { clearAuthSession, getAuthSessionSnapshot } from '../auth/auth-session';

const DEFAULT_API_BASE_URL = 'http://localhost:3004/api';

type ApiErrorBody = {
  message?: string | string[];
};

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
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (session?.accessToken) {
    headers.set('Authorization', `Bearer ${session.accessToken}`);
  }

  let response: Response;

  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error('Nao foi possivel conectar com a API do Jornada.');
  }

  if (!response.ok) {
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

    if (response.status === 401) {
      clearAuthSession();
    }

    throw new Error(errorMessage);
  }

  return (await response.json()) as TResponse;
}
