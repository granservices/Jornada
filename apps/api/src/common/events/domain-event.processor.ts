import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DOMAIN_EVENT_QUEUE_NAME } from './domain-event.constants';
import { DomainEventProcessingService } from './domain-event-processing.service';
import { DomainEventQueueJob } from './domain-event-queue.service';

@Injectable()
@Processor(DOMAIN_EVENT_QUEUE_NAME, { concurrency: 5 })
export class DomainEventProcessor extends WorkerHost {
  private readonly logger = new Logger(DomainEventProcessor.name);

  constructor(private readonly processing: DomainEventProcessingService) {
    super();
  }

  async process(job: Job<DomainEventQueueJob>) {
    try {
      await this.processing.process(job.data.eventId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown domain event delivery error';
      const attempt = job.attemptsMade + 1;
      const maxAttempts = job.opts.attempts ?? 1;

      if (attempt >= maxAttempts) {
        await this.processing.markFailed(job.data.eventId, message);
      } else {
        await this.processing.markForRetry(job.data.eventId, message);
      }

      throw error;
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<DomainEventQueueJob> | undefined, error: Error) {
    this.logger.error(
      `Domain event job ${job?.id ?? 'unknown'} failed for ${job?.data.eventId ?? 'unknown'}: ${error.message}`,
    );
  }
}
