import { Injectable, OnModuleInit } from '@nestjs/common';
import { SupportCaseEventType } from '@prisma/client';
import { DomainEventConsumerRegistry } from '../../common/events/domain-event-consumer-registry.service';
import { DomainEvent, DomainEventConsumer } from '../../common/events/domain-event.types';
import { PrismaService } from '../../database/prisma.service';

const CONSUMER_NAME = 'help-hub.form-completion';

@Injectable()
export class HelpHubFormCompletionConsumer
  implements DomainEventConsumer, OnModuleInit
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly consumers: DomainEventConsumerRegistry,
  ) {}

  onModuleInit() {
    this.consumers.register(this);
  }

  supports(eventType: string) {
    return eventType === 'forms.request.completed';
  }

  async handle(event: DomainEvent) {
    const context = this.readHelpHubContext(event);
    if (!context) {
      return;
    }

    await this.prisma.$transaction(async (transaction) => {
      const alreadyProcessed = await transaction.processedDomainEvent.findUnique({
        where: {
          consumer_eventId: {
            consumer: CONSUMER_NAME,
            eventId: event.id,
          },
        },
      });
      if (alreadyProcessed) {
        return;
      }

      const supportCase = await transaction.supportCase.findUnique({
        where: { id: context.supportCaseId },
        select: { id: true },
      });
      if (!supportCase) {
        throw new Error('Atendimento de origem do formulario nao encontrado.');
      }

      await transaction.supportCaseEvent.create({
        data: {
          supportCaseId: supportCase.id,
          eventType: SupportCaseEventType.COMMENTED,
          metadata: {
            source: 'quick_forms',
            eventId: event.id,
            formRequestId: context.formRequestId,
            message: 'Formulario solicitado foi respondido.',
          },
        },
      });

      await transaction.processedDomainEvent.create({
        data: { consumer: CONSUMER_NAME, eventId: event.id },
      });
    });
  }

  private readHelpHubContext(event: DomainEvent) {
    if (!event.payload || typeof event.payload !== 'object' || Array.isArray(event.payload)) {
      return null;
    }

    const payload = event.payload as Record<string, unknown>;
    if (
      payload.sourceApplication !== 'HELP_HUB' ||
      payload.sourceContextType !== 'SupportCase' ||
      typeof payload.sourceContextId !== 'string' ||
      typeof payload.formRequestId !== 'string'
    ) {
      return null;
    }

    return {
      supportCaseId: payload.sourceContextId,
      formRequestId: payload.formRequestId,
    };
  }
}
