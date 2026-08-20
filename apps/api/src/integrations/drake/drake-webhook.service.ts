import { Injectable, Logger } from '@nestjs/common';
import { DrakeWebhookStorageService } from './drake-webhook-storage.service';
import { DrakeWebhookReceipt, DrakeWebhookType } from './drake.types';

@Injectable()
export class DrakeWebhookService {
  private readonly logger = new Logger(DrakeWebhookService.name);

  constructor(private readonly storageService: DrakeWebhookStorageService) {}

  async receive(
    webhookType: DrakeWebhookType,
    payload: Record<string, unknown>,
  ): Promise<DrakeWebhookReceipt> {
    const receivedAt = new Date().toISOString();
    const metadata = {
      eventName: this.readString(payload, ['event', 'eventName', 'type']),
      eventId: this.readString(payload, ['eventId', 'id', 'codigoEvento']),
      employeeId: this.readString(payload, [
        'employeeId',
        'colaboradorId',
        'matricula',
      ]),
      receivedAt,
    };

    const storagePath = await this.storageService.persist(
      webhookType,
      payload,
      metadata,
    );

    this.logger.log(
      `Webhook ${webhookType} received and stored at ${storagePath}`,
    );

    return {
      ok: true,
      message: `${webhookType} webhook received successfully.`,
      webhookType,
      receivedAt,
      stored: true,
    };
  }

  private readString(payload: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
      const value = payload[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
    }

    return null;
  }
}
