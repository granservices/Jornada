import { Prisma } from '@prisma/client';

export type DomainEvent = {
  id: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Prisma.JsonValue;
  correlationId: string | null;
};

export interface DomainEventConsumer {
  supports(eventType: string): boolean;
  handle(event: DomainEvent): Promise<void>;
}
