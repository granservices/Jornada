import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

type OutboxClient = Pick<PrismaService, 'domainEventOutbox'>;

export type DomainEventRecord = {
  idempotencyKey: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  correlationId?: string | null;
};

@Injectable()
export class DomainEventOutboxService {
  constructor(private readonly prisma: PrismaService) {}

  record(event: DomainEventRecord) {
    return this.recordWith(this.prisma, event);
  }

  recordWith(client: OutboxClient, event: DomainEventRecord) {
    return client.domainEventOutbox.upsert({
      where: { idempotencyKey: event.idempotencyKey },
      create: {
        idempotencyKey: event.idempotencyKey,
        eventType: event.eventType,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        payload: event.payload as Prisma.InputJsonValue,
        correlationId: event.correlationId ?? null,
      },
      update: {},
    });
  }
}
