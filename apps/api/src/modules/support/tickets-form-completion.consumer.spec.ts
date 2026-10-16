import { SupportCaseEventType } from '@prisma/client';
import { TicketsFormCompletionConsumer } from './tickets-form-completion.consumer';

describe('TicketsFormCompletionConsumer', () => {
  it('records one operational completion event for a Tickets form request', async () => {
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
    const consumer = new TicketsFormCompletionConsumer(prisma as never);

    await consumer.handle({
      id: 'event-1',
      eventType: 'forms.request.completed',
      aggregateType: 'FormRequest',
      aggregateId: 'request-1',
      correlationId: null,
      payload: {
        formRequestId: 'request-1',
        sourceApplication: 'TICKETS',
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
      data: { consumer: 'tickets.form-completion', eventId: 'event-1' },
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
    const consumer = new TicketsFormCompletionConsumer(prisma as never);

    await consumer.handle({
      id: 'event-1',
      eventType: 'forms.request.completed',
      aggregateType: 'FormRequest',
      aggregateId: 'request-1',
      correlationId: null,
      payload: {
        sourceApplication: 'TICKETS',
        sourceContextType: 'SupportCase',
        sourceContextId: 'case-1',
      },
    });

    expect(prisma.supportCaseEvent.create).not.toHaveBeenCalled();
  });
});
