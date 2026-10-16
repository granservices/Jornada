import { useSyncExternalStore } from 'react';
import {
  getAuthSessionSnapshot,
  subscribeAuthSession,
} from './auth-session';

export function useAuthSession() {
  return useSyncExternalStore(
    subscribeAuthSession,
    getAuthSessionSnapshot,
    () => null,
  );
}
