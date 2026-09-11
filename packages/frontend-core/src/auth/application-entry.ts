type ApplicationEntry = {
  code: string;
  entryPath: string;
};

const DEFAULT_HELP_HUB_BASE_URL = 'http://localhost:3007';
const DEFAULT_QUICK_FORMS_BASE_URL = 'http://localhost:3008';
const DEFAULT_JORNADA_BASE_URL = 'http://localhost:3006';

export function centralLoginHref(application: ApplicationEntry) {
  const jornadaBaseUrl =
    import.meta.env.VITE_JORNADA_BASE_URL ?? DEFAULT_JORNADA_BASE_URL;
  const target = new URL('/login', jornadaBaseUrl);

  target.searchParams.set('app', application.code);
  target.searchParams.set('returnTo', application.entryPath);

  return target.toString();
}

export function applicationEntryHref(application: ApplicationEntry) {
  if (application.code === 'HELP_HUB') {
    const helpHubBaseUrl =
      import.meta.env.VITE_HELP_HUB_BASE_URL ??
      import.meta.env.VITE_ATENDIMENTO_BASE_URL ??
      import.meta.env.VITE_OPS_BASE_URL ??
      DEFAULT_HELP_HUB_BASE_URL;

    return new URL(application.entryPath, helpHubBaseUrl).toString();
  }

  if (application.code !== 'QUICK_FORMS') {
    return application.entryPath;
  }

  const quickFormsBaseUrl =
    import.meta.env.VITE_QUICK_FORMS_BASE_URL ?? DEFAULT_QUICK_FORMS_BASE_URL;

  return new URL(application.entryPath, quickFormsBaseUrl).toString();
}

export function applicationSsoHref(
  application: ApplicationEntry,
  ticket: string,
) {
  const entryHref = applicationEntryHref(application);

  if (!isExternalHref(entryHref)) {
    return entryHref;
  }

  const target = new URL('/sso', entryHref);
  target.searchParams.set('ticket', ticket);
  target.searchParams.set('returnTo', application.entryPath);
  return target.toString();
}

export function isExternalHref(href: string) {
  return /^https?:\/\//.test(href);
}
