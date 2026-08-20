export type DrakeWebhookType =
  'employees' | 'expiring-requirements' | 'boarding-schedule';

export type DrakeWebhookReceipt = {
  ok: true;
  message: string;
  webhookType: DrakeWebhookType;
  receivedAt: string;
  stored: boolean;
  duplicate: boolean;
  requestId?: string;
  correlationId: string;
  idempotencyKey: string;
};

export type DrakeWebhookQueueJob = {
  inboxEventId: string;
  webhookType: DrakeWebhookType;
  idempotencyKey: string;
  correlationId: string;
};

export type DrakeWebhookMetadata = {
  eventName: string | null;
  eventId: string | null;
  employeeId: string | null;
  receivedAt: string;
  requestId?: string;
  correlationId: string;
  idempotencyKey: string;
};
