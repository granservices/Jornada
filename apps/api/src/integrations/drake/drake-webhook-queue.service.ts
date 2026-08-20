import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import {
  DRAKE_WEBHOOK_JOB_NAME,
  DRAKE_WEBHOOK_QUEUE_NAME,
} from './drake.constants';
import { DrakeWebhookQueueJob } from './drake.types';
import { DrakeWebhookStorageService } from './drake-webhook-storage.service';

@Injectable()
export class DrakeWebhookQueueService {
  private readonly logger = new Logger(DrakeWebhookQueueService.name);

  constructor(
    @InjectQueue(DRAKE_WEBHOOK_QUEUE_NAME)
    private readonly queue: Queue<DrakeWebhookQueueJob>,
    private readonly configService: ConfigService,
    private readonly storageService: DrakeWebhookStorageService,
  ) {}

  async enqueue(job: DrakeWebhookQueueJob) {
    if (!this.configService.get<boolean>('DRAKE_WEBHOOK_QUEUE_ENABLED')) {
      this.logger.warn(
        `Drake queue disabled. Inbox event ${job.idempotencyKey} kept as received for later processing.`,
      );
      return;
    }

    await this.queue.add(DRAKE_WEBHOOK_JOB_NAME, job, {
      jobId: job.idempotencyKey,
      attempts: this.configService.getOrThrow<number>(
        'DRAKE_WEBHOOK_QUEUE_ATTEMPTS',
      ),
      backoff: {
        type: 'exponential',
        delay: this.configService.getOrThrow<number>(
          'DRAKE_WEBHOOK_QUEUE_BACKOFF_MS',
        ),
      },
      removeOnComplete: {
        age: 7 * 24 * 60 * 60,
        count: 1000,
      },
      removeOnFail: false,
    });

    await this.storageService.markQueued(job.idempotencyKey);
  }
}
