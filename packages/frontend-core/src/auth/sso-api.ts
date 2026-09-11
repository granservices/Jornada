import { apiFetch } from '../api/api-client';
import { applicationSsoHref } from './application-entry';

type ApplicationEntry = {
  code: string;
  entryPath: string;
};

export async function requestApplicationSsoHref(application: ApplicationEntry) {
  const response = await apiFetch<{ ticket: string }>('/auth/sso-tickets', {
    method: 'POST',
    body: JSON.stringify({ applicationCode: application.code }),
  });

  return applicationSsoHref(application, response.ticket);
}
