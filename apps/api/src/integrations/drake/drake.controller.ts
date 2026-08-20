import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { DrakeWebhookAuthGuard } from './drake-webhook-auth.guard';
import { DrakeWebhookService } from './drake-webhook.service';

@Controller('integrations/drake')
@UseGuards(DrakeWebhookAuthGuard)
export class DrakeController {
  constructor(private readonly drakeWebhookService: DrakeWebhookService) {}

  @Post('employees')
  @HttpCode(202)
  receiveEmployees(@Body() payload: Record<string, unknown>) {
    return this.drakeWebhookService.receive('employees', payload);
  }

  @Post('expiring-requirements')
  @HttpCode(202)
  receiveExpiringRequirements(@Body() payload: Record<string, unknown>) {
    return this.drakeWebhookService.receive('expiring-requirements', payload);
  }

  @Post('boarding-schedule')
  @HttpCode(202)
  receiveBoardingSchedule(@Body() payload: Record<string, unknown>) {
    return this.drakeWebhookService.receive('boarding-schedule', payload);
  }
}
