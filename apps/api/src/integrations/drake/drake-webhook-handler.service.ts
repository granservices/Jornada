import { Injectable, Logger } from '@nestjs/common';
import { DrakeWebhookType } from './drake.types';

@Injectable()
export class DrakeWebhookHandlerService {
  private readonly logger = new Logger(DrakeWebhookHandlerService.name);

  handle(
    webhookType: DrakeWebhookType,
    payload: Record<string, unknown>,
    correlationId: string,
  ) {
    switch (webhookType) {
      case 'employees':
        this.logger.log(
          `Employee webhook normalized for correlation ${correlationId} with keys: ${Object.keys(payload).join(', ')}`,
        );
        return;
      case 'expiring-requirements':
        this.logger.log(
          `Expiring requirements webhook normalized for correlation ${correlationId}.`,
        );
        return;
      case 'boarding-schedule':
        this.logger.log(
          `Boarding schedule webhook normalized for correlation ${correlationId}.`,
        );
        return;
      default:
        throw new Error('Unsupported Drake webhook type received.');
    }
  }
}
