export const SUPPORT_NOTIFICATION_PORT = Symbol('SUPPORT_NOTIFICATION_PORT');

export type SupportNotificationProvider =
  | 'INTERNAL'
  | 'MICROSOFT_TEAMS'
  | 'EMAIL'
  | 'WHATSAPP';

export type SupportNotificationPayload = {
  supportCaseId: string;
  conversationId?: string;
  provider?: SupportNotificationProvider;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
};

export interface SupportNotificationPort {
  notifyCaseUpdate(payload: SupportNotificationPayload): Promise<void>;
}
