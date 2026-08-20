import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { DRAKE_WEBHOOK_QUEUE_NAME } from './drake.constants';
import { DrakeWebhookProcessingService } from './drake-webhook-processing.service';
import { DrakeWebhookStorageService } from './drake-webhook-storage.service';
import { DrakeWebhookQueueJob } from './drake.types';

@Injectable()
@Processor(DRAKE_WEBHOOK_QUEUE_NAME, {
  concurrency: 5,
})
export class DrakeWebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(DrakeWebhookProcessor.name);

  constructor(
    private readonly processingService: DrakeWebhookProcessingService,
    private readonly storageService: DrakeWebhookStorageService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job<DrakeWebhookQueueJob>) {
    const enabled = this.configService.get<boolean>(
      'DRAKE_WEBHOOK_QUEUE_ENABLED',
    );
    if (!enabled) {
      return;
    }

    const attempt = job.attemptsMade + 1;
    await this.storageService.markProcessing(job.data.idempotencyKey, attempt);

    try {
      await this.processingService.process(job.data);
      await this.storageService.markProcessed(job.data.idempotencyKey);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown Drake queue error';
      const maxAttempts = job.opts.attempts ?? 1;

      if (attempt >= maxAttempts) {
        await this.storageService.markFailed(job.data.idempotencyKey, message);
      } else {
        await this.storageService.markQueued(job.data.idempotencyKey, message);
      }

      throw error;
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<DrakeWebhookQueueJob> | undefined, error: Error) {
    this.logger.error(
      `Drake queue job ${job?.id ?? 'unknown'} failed for ${job?.data?.idempotencyKey ?? 'unknown'}: ${error.message}`,
    );
  }
}
