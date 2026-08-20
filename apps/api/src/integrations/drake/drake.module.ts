import { Module } from '@nestjs/common';
import { DrakeController } from './drake.controller';
import { DrakeWebhookAuthGuard } from './drake-webhook-auth.guard';
import { DrakeWebhookService } from './drake-webhook.service';
import { DrakeWebhookStorageService } from './drake-webhook-storage.service';

@Module({
  controllers: [DrakeController],
  providers: [
    DrakeWebhookAuthGuard,
    DrakeWebhookService,
    DrakeWebhookStorageService,
  ],
})
export class DrakeModule {}
