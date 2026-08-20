export type DrakeWebhookType =
  'employees' | 'expiring-requirements' | 'boarding-schedule';

export type DrakeWebhookReceipt = {
  ok: true;
  message: string;
  webhookType: DrakeWebhookType;
  receivedAt: string;
  stored: true;
};
