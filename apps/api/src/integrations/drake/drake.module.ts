import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BoardingScheduleModule } from '../../modules/boarding-schedule/boarding-schedule.module';
import { EmployeesModule } from '../../modules/employees/employees.module';
import { ExpiringRequirementsModule } from '../../modules/expiring-requirements/expiring-requirements.module';
import { DrakeController } from './drake.controller';
import { DRAKE_WEBHOOK_QUEUE_NAME } from './drake.constants';
import { DrakeWebhookAuthGuard } from './drake-webhook-auth.guard';
import { DrakeWebhookHandlerService } from './drake-webhook-handler.service';
import { DrakeWebhookProcessor } from './drake-webhook.processor';
import { DrakeWebhookProcessingService } from './drake-webhook-processing.service';
import { DrakeWebhookQueueService } from './drake-webhook-queue.service';
import { DrakeWebhookService } from './drake-webhook.service';
import { DrakeWebhookStorageService } from './drake-webhook-storage.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: DRAKE_WEBHOOK_QUEUE_NAME,
    }),
    EmployeesModule,
    BoardingScheduleModule,
    ExpiringRequirementsModule,
  ],
  controllers: [DrakeController],
  providers: [
    DrakeWebhookAuthGuard,
    DrakeWebhookService,
    DrakeWebhookStorageService,
    DrakeWebhookQueueService,
    DrakeWebhookProcessingService,
    DrakeWebhookHandlerService,
    DrakeWebhookProcessor,
  ],
})
export class DrakeModule {}
