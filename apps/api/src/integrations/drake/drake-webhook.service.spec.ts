import { DrakeWebhookService } from './drake-webhook.service';
import { DrakeWebhookQueueService } from './drake-webhook-queue.service';
import { DrakeWebhookStorageService } from './drake-webhook-storage.service';

describe('DrakeWebhookService', () => {
  let service: DrakeWebhookService;
  let storageService: {
    buildCorrelationId: jest.Mock;
    buildIdempotencyKey: jest.Mock;
    persist: jest.Mock;
  };
  let queueService: {
    enqueue: jest.Mock;
  };

  beforeEach(() => {
    storageService = {
      buildCorrelationId: jest.fn().mockReturnValue('drake:employees:evt-1'),
      buildIdempotencyKey: jest.fn().mockReturnValue('drake:employees:evt-1'),
      persist: jest.fn(),
    };
    queueService = {
      enqueue: jest.fn(),
    };

    service = new DrakeWebhookService(
      storageService as unknown as DrakeWebhookStorageService,
      queueService as unknown as DrakeWebhookQueueService,
    );
  });

  it('returns correlation metadata for a fresh webhook', async () => {
    storageService.persist.mockResolvedValue({
      inboxEventId: 'inbox-1',
      duplicate: false,
      storagePath: '/tmp/employees.json',
    });

    const response = await service.receive(
      'employees',
      {
        eventId: 'evt-1',
        employeeId: 'emp-1',
        eventName: 'employee.updated',
      },
      {
        requestId: 'req-1',
      },
    );

    expect(storageService.buildCorrelationId).toHaveBeenCalled();
    expect(storageService.buildIdempotencyKey).toHaveBeenCalled();
    expect(response.duplicate).toBe(false);
    expect(response.stored).toBe(true);
    expect(response.correlationId).toBe('drake:employees:evt-1');
    expect(response.idempotencyKey).toBe('drake:employees:evt-1');
    expect(response.requestId).toBe('req-1');
    expect(queueService.enqueue).toHaveBeenCalledWith({
      inboxEventId: 'inbox-1',
      webhookType: 'employees',
      idempotencyKey: 'drake:employees:evt-1',
      correlationId: 'drake:employees:evt-1',
    });
  });

  it('returns duplicate=true for repeated deliveries', async () => {
    storageService.persist.mockResolvedValue({
      duplicate: true,
      storagePath: '/tmp/employees.json',
    });

    const response = await service.receive(
      'employees',
      {
        eventId: 'evt-1',
        employeeId: 'emp-1',
      },
      {
        requestId: 'req-2',
      },
    );

    expect(response.duplicate).toBe(true);
    expect(response.stored).toBe(false);
    expect(response.message).toContain('already received');
    expect(queueService.enqueue).not.toHaveBeenCalled();
  });
});
