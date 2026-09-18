import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { DOMAIN_EVENT_JOB_NAME, DOMAIN_EVENT_QUEUE_NAME } from './domain-event.constants';

export type DomainEventQueueJob = { eventId: string };

@Injectable()
export class DomainEventQueueService {
  private readonly logger = new Logger(DomainEventQueueService.name);

  constructor(
    @InjectQueue(DOMAIN_EVENT_QUEUE_NAME)
    private readonly queue: Queue<DomainEventQueueJob>,
    private readonly config: ConfigService,
  ) {}

  async enqueue(eventId: string) {
    if (!this.config.get<boolean>('DOMAIN_EVENT_QUEUE_ENABLED')) {
      this.logger.warn(`Domain event ${eventId} remains pending because the queue is disabled.`);
      return;
    }

    await this.queue.add(DOMAIN_EVENT_JOB_NAME, { eventId }, {
      jobId: eventId,
      attempts: this.config.getOrThrow<number>('DOMAIN_EVENT_QUEUE_ATTEMPTS'),
      backoff: {
        type: 'exponential',
        delay: this.config.getOrThrow<number>('DOMAIN_EVENT_QUEUE_BACKOFF_MS'),
      },
      removeOnComplete: { age: 7 * 24 * 60 * 60, count: 5000 },
      removeOnFail: false,
    });
  }
}
