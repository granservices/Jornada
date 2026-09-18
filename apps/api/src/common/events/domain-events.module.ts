import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../database/prisma.module';
import { DOMAIN_EVENT_QUEUE_NAME } from './domain-event.constants';
import { DomainEventConsumerRegistry } from './domain-event-consumer-registry.service';
import { DomainEventOutboxService } from './domain-event-outbox.service';
import { DomainEventProcessingService } from './domain-event-processing.service';
import { DomainEventProcessor } from './domain-event.processor';
import { DomainEventQueueService } from './domain-event-queue.service';
import { DomainEventRelayService } from './domain-event-relay.service';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: DOMAIN_EVENT_QUEUE_NAME }),
  ],
  providers: [
    DomainEventOutboxService,
    DomainEventConsumerRegistry,
    DomainEventProcessingService,
    DomainEventQueueService,
    DomainEventRelayService,
    DomainEventProcessor,
  ],
  exports: [
    DomainEventOutboxService,
    DomainEventConsumerRegistry,
    DomainEventProcessingService,
    DomainEventQueueService,
  ],
})
export class DomainEventsModule {}
