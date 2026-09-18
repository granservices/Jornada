import { Injectable, NotFoundException } from '@nestjs/common';
import { DomainEventOutboxStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { DomainEventConsumerRegistry } from './domain-event-consumer-registry.service';

@Injectable()
export class DomainEventProcessingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly consumers: DomainEventConsumerRegistry,
  ) {}

  async process(eventId: string) {
    const event = await this.prisma.domainEventOutbox.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Evento de dominio nao encontrado.');
    }

    if (event.status === DomainEventOutboxStatus.DELIVERED) {
      return;
    }

    await this.prisma.domainEventOutbox.update({
      where: { id: event.id },
      data: {
        status: DomainEventOutboxStatus.PROCESSING,
        attempts: { increment: 1 },
        lastError: null,
      },
    });

    await this.consumers.dispatch(event);

    await this.prisma.domainEventOutbox.update({
      where: { id: event.id },
      data: {
        status: DomainEventOutboxStatus.DELIVERED,
        deliveredAt: new Date(),
        lastError: null,
      },
    });
  }

  async markForRetry(eventId: string, message: string) {
    await this.prisma.domainEventOutbox.update({
      where: { id: eventId },
      data: {
        status: DomainEventOutboxStatus.PENDING,
        lastError: message,
      },
    });
  }

  async markFailed(eventId: string, message: string) {
    await this.prisma.domainEventOutbox.update({
      where: { id: eventId },
      data: {
        status: DomainEventOutboxStatus.FAILED,
        lastError: message,
      },
    });
  }
}
