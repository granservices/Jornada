import { DomainEventRelayService } from './domain-event-relay.service';

describe('DomainEventRelayService', () => {
  it('queues each persisted pending event for asynchronous delivery', async () => {
    const prisma = {
      domainEventOutbox: {
        findMany: jest.fn().mockResolvedValue([{ id: 'event-1' }, { id: 'event-2' }]),
      },
    };
    const queue = { enqueue: jest.fn().mockResolvedValue(undefined) };
    const relay = new DomainEventRelayService(prisma as never, queue as never, {
      getOrThrow: jest.fn().mockReturnValue(10000),
    } as never);

    await relay.relayPending();

    expect(queue.enqueue).toHaveBeenCalledTimes(2);
    expect(queue.enqueue).toHaveBeenNthCalledWith(1, 'event-1');
    expect(queue.enqueue).toHaveBeenNthCalledWith(2, 'event-2');
  });
});
