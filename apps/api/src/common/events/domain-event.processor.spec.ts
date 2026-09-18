import { DomainEventProcessor } from './domain-event.processor';

describe('DomainEventProcessor', () => {
  it('returns a delivery failure to pending while retry attempts remain', async () => {
    const processing = {
      process: jest.fn().mockRejectedValue(new Error('consumer unavailable')),
      markForRetry: jest.fn().mockResolvedValue(undefined),
      markFailed: jest.fn(),
    };
    const processor = new DomainEventProcessor(processing as never);

    await expect(
      processor.process({
        data: { eventId: 'event-1' },
        attemptsMade: 0,
        opts: { attempts: 3 },
      } as never),
    ).rejects.toThrow('consumer unavailable');

    expect(processing.markForRetry).toHaveBeenCalledWith('event-1', 'consumer unavailable');
    expect(processing.markFailed).not.toHaveBeenCalled();
  });

  it('records a terminal failure after the last allowed attempt', async () => {
    const processing = {
      process: jest.fn().mockRejectedValue(new Error('consumer unavailable')),
      markForRetry: jest.fn(),
      markFailed: jest.fn().mockResolvedValue(undefined),
    };
    const processor = new DomainEventProcessor(processing as never);

    await expect(
      processor.process({
        data: { eventId: 'event-1' },
        attemptsMade: 2,
        opts: { attempts: 3 },
      } as never),
    ).rejects.toThrow('consumer unavailable');

    expect(processing.markFailed).toHaveBeenCalledWith('event-1', 'consumer unavailable');
    expect(processing.markForRetry).not.toHaveBeenCalled();
  });
});
