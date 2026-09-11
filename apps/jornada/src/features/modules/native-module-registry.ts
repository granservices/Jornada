export const nativeModuleRegistry = {
  JORNADA: {
    name: 'Jornada',
    entryPath: '/inbox',
  },
  HELP_HUB: {
    name: 'Focall',
    entryPath: '/atendimentos',
  },
  QUICK_FORMS: {
    name: 'QuickForms',
    entryPath: '/formularios',
  },
} as const;

export type NativeModuleCode = keyof typeof nativeModuleRegistry;

export function isNativeModuleCode(code: string): code is NativeModuleCode {
  return code in nativeModuleRegistry;
}
