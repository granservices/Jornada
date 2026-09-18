import { Injectable, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainEventOutboxStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { DomainEventQueueService } from './domain-event-queue.service';

@Injectable()
export class DomainEventRelayService implements OnApplicationBootstrap, OnModuleDestroy {
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: DomainEventQueueService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    await this.relayPending();
    const interval = this.config.getOrThrow<number>('DOMAIN_EVENT_RELAY_INTERVAL_MS');
    this.timer = setInterval(() => void this.relayPending(), interval);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async relayPending() {
    const staleBefore = new Date(
      Date.now() - this.config.getOrThrow<number>('DOMAIN_EVENT_PROCESSING_TIMEOUT_MS'),
    );
    const events = await this.prisma.domainEventOutbox.findMany({
      where: {
        OR: [
          {
            status: DomainEventOutboxStatus.PENDING,
            availableAt: { lte: new Date() },
          },
          {
            status: DomainEventOutboxStatus.PROCESSING,
            updatedAt: { lte: staleBefore },
          },
        ],
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    await Promise.all(events.map((event) => this.queue.enqueue(event.id)));
  }
}
