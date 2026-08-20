import { Injectable, Logger } from '@nestjs/common';
import { BoardingScheduleIngestionService } from '../../modules/boarding-schedule/services/boarding-schedule-ingestion.service';
import { EmployeesIngestionService } from '../../modules/employees/services/employees-ingestion.service';
import { ExpiringRequirementsIngestionService } from '../../modules/expiring-requirements/services/expiring-requirements-ingestion.service';
import { DrakeWebhookType } from './drake.types';

@Injectable()
export class DrakeWebhookHandlerService {
  private readonly logger = new Logger(DrakeWebhookHandlerService.name);

  constructor(
    private readonly employeesIngestionService: EmployeesIngestionService,
    private readonly boardingScheduleIngestionService: BoardingScheduleIngestionService,
    private readonly expiringRequirementsIngestionService: ExpiringRequirementsIngestionService,
  ) {}

  handle(
    webhookType: DrakeWebhookType,
    payload: Record<string, unknown>,
    correlationId: string,
  ) {
    switch (webhookType) {
      case 'employees':
        return this.employeesIngestionService.ingest(payload, {
          correlationId,
        });
      case 'expiring-requirements':
        return this.expiringRequirementsIngestionService.ingest(payload, {
          correlationId,
        });
      case 'boarding-schedule':
        return this.boardingScheduleIngestionService.ingest(payload, {
          correlationId,
        });
      default:
        this.logger.error(
          `Unsupported Drake webhook type received for ${correlationId}.`,
        );
        throw new Error('Unsupported Drake webhook type received.');
    }
  }
}
