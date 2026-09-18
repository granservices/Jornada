import { Injectable } from '@nestjs/common';
import { DomainEvent, DomainEventConsumer } from './domain-event.types';

@Injectable()
export class DomainEventConsumerRegistry {
  private readonly consumers: DomainEventConsumer[] = [];

  register(consumer: DomainEventConsumer) {
    this.consumers.push(consumer);
  }

  async dispatch(event: DomainEvent) {
    const handlers = this.consumers.filter((consumer) =>
      consumer.supports(event.eventType),
    );

    await Promise.all(handlers.map((consumer) => consumer.handle(event)));
  }
}
