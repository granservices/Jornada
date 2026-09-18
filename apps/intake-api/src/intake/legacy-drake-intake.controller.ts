import { Controller, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { IntakeAuthGuard } from './intake-auth.guard';
import { IntakeService } from './intake.service';

const LEGACY_EVENT_TYPE_BY_ROUTE: Record<string, string | null> = {
  'boarding-schedule': 'logistics_schedule',
  'expiring-requirements': 'qualification_pending',
  employees: null,
};

@Controller('integrations/drake')
@UseGuards(IntakeAuthGuard)
export class LegacyDrakeIntakeController {
  constructor(private readonly intakeService: IntakeService) {}

  @Post(':webhookType')
  @HttpCode(202)
  receiveLegacyDrakeEvent(
    @Param('webhookType') webhookType: string,
    @Req() request: Request,
  ) {
    this.applyDiagnosticHeaders(request, webhookType);
    return this.intakeService.receive(request);
  }

  private applyDiagnosticHeaders(request: Request, webhookType: string) {
    request.headers['x-source'] ??= `drake-legacy:${webhookType}`;

    const mappedType = LEGACY_EVENT_TYPE_BY_ROUTE[webhookType];
    if (mappedType) {
      request.headers['x-event-type'] ??= mappedType;
    }
  }
}
