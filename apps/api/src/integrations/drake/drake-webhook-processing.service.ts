import { Injectable } from '@nestjs/common';
import { DrakeWebhookHandlerService } from './drake-webhook-handler.service';
import { DrakeWebhookStorageService } from './drake-webhook-storage.service';
import { DrakeWebhookQueueJob } from './drake.types';

@Injectable()
export class DrakeWebhookProcessingService {
  constructor(
    private readonly storageService: DrakeWebhookStorageService,
    private readonly handlerService: DrakeWebhookHandlerService,
  ) {}

  async process(job: DrakeWebhookQueueJob) {
    const inboxEvent = await this.storageService.findByIdempotencyKey(
      job.idempotencyKey,
    );

    if (!inboxEvent) {
      throw new Error(
        `Inbox event ${job.idempotencyKey} was not found for processing.`,
      );
    }

    const payload = this.asRecord(inboxEvent.payload);

    this.handlerService.handle(
      job.webhookType,
      payload,
      inboxEvent.correlationId,
    );
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('Stored Drake payload is invalid for processing.');
    }

    return value as Record<string, unknown>;
  }
}
