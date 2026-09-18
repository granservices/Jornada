import { SupportCaseEventType } from '@prisma/client';
import { HelpHubFormCompletionConsumer } from './help-hub-form-completion.consumer';

describe('HelpHubFormCompletionConsumer', () => {
  it('records one operational completion event for a HelpHub form request', async () => {
    const prisma = {
      $transaction: jest.fn((callback) => callback(prisma)),
      processedDomainEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'processed-1' }),
      },
      supportCase: {
        findUnique: jest.fn().mockResolvedValue({ id: 'case-1' }),
      },
      supportCaseEvent: {
        create: jest.fn().mockResolvedValue({ id: 'case-event-1' }),
      },
    };
    const consumer = new HelpHubFormCompletionConsumer(prisma as never);

    await consumer.handle({
      id: 'event-1',
      eventType: 'forms.request.completed',
      aggregateType: 'FormRequest',
      aggregateId: 'request-1',
      correlationId: null,
      payload: {
        formRequestId: 'request-1',
        sourceApplication: 'HELP_HUB',
        sourceContextType: 'SupportCase',
        sourceContextId: 'case-1',
      },
    });

    expect(prisma.supportCaseEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        supportCaseId: 'case-1',
        eventType: SupportCaseEventType.COMMENTED,
        metadata: expect.objectContaining({
          source: 'quick_forms',
          formRequestId: 'request-1',
        }),
      }),
    });
    expect(prisma.processedDomainEvent.create).toHaveBeenCalledWith({
      data: { consumer: 'help-hub.form-completion', eventId: 'event-1' },
    });
  });

  it('does not duplicate a previously processed event', async () => {
    const prisma = {
      $transaction: jest.fn((callback) => callback(prisma)),
      processedDomainEvent: {
        findUnique: jest.fn().mockResolvedValue({ id: 'processed-1' }),
        create: jest.fn(),
      },
      supportCase: { findUnique: jest.fn() },
      supportCaseEvent: { create: jest.fn() },
    };
    const consumer = new HelpHubFormCompletionConsumer(prisma as never);

    await consumer.handle({
      id: 'event-1',
      eventType: 'forms.request.completed',
      aggregateType: 'FormRequest',
      aggregateId: 'request-1',
      correlationId: null,
      payload: {
        sourceApplication: 'HELP_HUB',
        sourceContextType: 'SupportCase',
        sourceContextId: 'case-1',
      },
    });

    expect(prisma.supportCaseEvent.create).not.toHaveBeenCalled();
  });
});
