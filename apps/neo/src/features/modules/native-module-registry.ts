export const nativeModuleRegistry = {
  JORNADA: {
    name: 'Jornada',
    entryPath: '/inbox',
  },
  TICKETS: {
    name: 'Tickets',
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
