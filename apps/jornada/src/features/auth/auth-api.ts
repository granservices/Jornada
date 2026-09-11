import type { AuthSessionSnapshot } from './auth-session';
import { getApiBaseUrl } from '../api/api-client';

type LoginPayload = {
  identifier: string;
  password: string;
};

type ApiErrorBody = {
  message?: string | string[];
};

type AuthApiErrorBody = ApiErrorBody;

export async function loginWithPassword(
  payload: LoginPayload,
): Promise<AuthSessionSnapshot> {
  const response = await fetch(`${getApiBaseUrl()}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMessage = 'Nao foi possivel entrar agora.';

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

    throw new Error(errorMessage);
  }

  return (await response.json()) as AuthSessionSnapshot;
}

export async function consumeSsoTicket(ticket: string): Promise<AuthSessionSnapshot> {
  const response = await fetch(`${getApiBaseUrl()}/auth/sso-tickets/consume`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ticket }),
  });

  if (!response.ok) {
    throw new Error(await readAuthApiError(response));
  }

  return (await response.json()) as AuthSessionSnapshot;
}

async function readAuthApiError(response: Response) {
  let errorMessage = 'Nao foi possivel concluir a autenticacao agora.';

  try {
    const body = (await response.json()) as AuthApiErrorBody;
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
