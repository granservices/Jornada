import { nativeModuleRegistry, isNativeModuleCode } from '../modules/native-module-registry';

type ApplicationEntry = {
  code: string;
  entryPath: string;
  entryKind?: 'NATIVE' | 'REDIRECT';
};

export function applicationEntryHref(application: ApplicationEntry) {
  if (
    application.entryKind === 'REDIRECT' &&
    isExternalHref(application.entryPath)
  ) {
    return application.entryPath;
  }

  if (isNativeModuleCode(application.code)) {
    return nativeModuleRegistry[application.code].entryPath;
  }

  return application.entryPath;
}

export function isExternalHref(href: string) {
  return /^https?:\/\//.test(href);
}
