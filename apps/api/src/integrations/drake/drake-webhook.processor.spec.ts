import { ConfigService } from '@nestjs/config';
import { DrakeWebhookProcessingService } from './drake-webhook-processing.service';
import { DrakeWebhookProcessor } from './drake-webhook.processor';
import { DrakeWebhookStorageService } from './drake-webhook-storage.service';
import { DrakeWebhookQueueJob } from './drake.types';

describe('DrakeWebhookProcessor', () => {
  let processor: DrakeWebhookProcessor;
  let processingService: {
    process: jest.Mock;
  };
  let storageService: {
    markProcessing: jest.Mock;
    markProcessed: jest.Mock;
    markQueued: jest.Mock;
    markFailed: jest.Mock;
  };
  let configService: {
    get: jest.Mock;
  };

  const baseJob = {
    attemptsMade: 0,
    opts: {
      attempts: 3,
    },
    data: {
      inboxEventId: 'inbox-1',
      webhookType: 'employees',
      idempotencyKey: 'drake:employees:evt-1',
      correlationId: 'drake:employees:evt-1',
    } satisfies DrakeWebhookQueueJob,
  };

  beforeEach(() => {
    processingService = {
      process: jest.fn(),
    };
    storageService = {
      markProcessing: jest.fn(),
      markProcessed: jest.fn(),
      markQueued: jest.fn(),
      markFailed: jest.fn(),
    };
    configService = {
      get: jest.fn().mockReturnValue(true),
    };

    processor = new DrakeWebhookProcessor(
      processingService as unknown as DrakeWebhookProcessingService,
      storageService as unknown as DrakeWebhookStorageService,
      configService as unknown as ConfigService,
    );
  });

  it('marks webhook as processed after successful handling', async () => {
    await processor.process(baseJob);

    expect(storageService.markProcessing).toHaveBeenCalledWith(
      'drake:employees:evt-1',
      1,
    );
    expect(processingService.process).toHaveBeenCalledWith(baseJob.data);
    expect(storageService.markProcessed).toHaveBeenCalledWith(
      'drake:employees:evt-1',
    );
  });

  it('returns webhook to queued state when a retry is still available', async () => {
    processingService.process.mockRejectedValueOnce(new Error('temporary'));

    await expect(processor.process(baseJob)).rejects.toThrow('temporary');

    expect(storageService.markQueued).toHaveBeenCalledWith(
      'drake:employees:evt-1',
      'temporary',
    );
    expect(storageService.markFailed).not.toHaveBeenCalled();
  });

  it('marks webhook as failed when all attempts are exhausted', async () => {
    processingService.process.mockRejectedValueOnce(new Error('permanent'));

    await expect(
      processor.process({
        ...baseJob,
        attemptsMade: 2,
      }),
    ).rejects.toThrow('permanent');

    expect(storageService.markFailed).toHaveBeenCalledWith(
      'drake:employees:evt-1',
      'permanent',
    );
    expect(storageService.markQueued).not.toHaveBeenCalled();
  });
});
