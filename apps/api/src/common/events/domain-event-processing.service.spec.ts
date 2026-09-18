import { DomainEventProcessingService } from './domain-event-processing.service';

describe('DomainEventProcessingService', () => {
  it('delivers a pending event before marking it as delivered', async () => {
    const prisma = {
      domainEventOutbox: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'event-1',
          eventType: 'forms.request.completed',
          aggregateType: 'FormRequest',
          aggregateId: 'request-1',
          payload: { sourceApplication: 'HELP_HUB' },
          correlationId: null,
          status: 'PENDING',
        }),
        update: jest.fn().mockResolvedValue({ id: 'event-1' }),
      },
    };
    const consumers = {
      dispatch: jest.fn().mockResolvedValue(undefined),
    };
    const service = new DomainEventProcessingService(
      prisma as never,
      consumers as never,
    );

    await service.process('event-1');

    expect(consumers.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'event-1', eventType: 'forms.request.completed' }),
    );
    expect(prisma.domainEventOutbox.update).toHaveBeenLastCalledWith({
      where: { id: 'event-1' },
      data: expect.objectContaining({ status: 'DELIVERED', deliveredAt: expect.any(Date) }),
    });
  });
});
