import { Injectable, Logger } from '@nestjs/common';
import { HttpRequestContext } from '../../common/http/request-context';
import { DrakeWebhookStorageService } from './drake-webhook-storage.service';
import {
  DrakeWebhookMetadata,
  DrakeWebhookReceipt,
  DrakeWebhookType,
} from './drake.types';

@Injectable()
export class DrakeWebhookService {
  private readonly logger = new Logger(DrakeWebhookService.name);

  constructor(private readonly storageService: DrakeWebhookStorageService) {}

  async receive(
    webhookType: DrakeWebhookType,
    payload: Record<string, unknown>,
    context: HttpRequestContext,
  ): Promise<DrakeWebhookReceipt> {
    const receivedAt = new Date().toISOString();
    const baseMetadata = {
      eventName: this.readString(payload, ['event', 'eventName', 'type']),
      eventId: this.readString(payload, ['eventId', 'id', 'codigoEvento']),
      employeeId: this.readString(payload, [
        'employeeId',
        'colaboradorId',
        'matricula',
      ]),
      receivedAt,
      requestId: context.requestId,
    };

    const metadata: DrakeWebhookMetadata = {
      ...baseMetadata,
      correlationId: this.storageService.buildCorrelationId(
        webhookType,
        baseMetadata,
      ),
      idempotencyKey: this.storageService.buildIdempotencyKey(
        webhookType,
        payload,
        baseMetadata,
      ),
    };

    const { duplicate, storagePath } = await this.storageService.persist({
      webhookType,
      payload,
      metadata,
    });

    if (duplicate) {
      this.logger.warn(
        `Duplicate Drake webhook ignored for ${webhookType} with idempotency key ${metadata.idempotencyKey}`,
      );
    } else {
      this.logger.log(
        `Webhook ${webhookType} received and stored at ${storagePath} with correlation ${metadata.correlationId}`,
      );
    }

    return {
      ok: true,
      message: duplicate
        ? `${webhookType} webhook already received.`
        : `${webhookType} webhook received successfully.`,
      webhookType,
      receivedAt,
      stored: !duplicate,
      duplicate,
      requestId: metadata.requestId,
      correlationId: metadata.correlationId,
      idempotencyKey: metadata.idempotencyKey,
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
