import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { DrakeWebhookAuthGuard } from './drake-webhook-auth.guard';
import { DrakeWebhookService } from './drake-webhook.service';
import { DrakeBoardingScheduleDto } from './dto/drake-boarding-schedule.dto';
import { DrakeEmployeesDto } from './dto/drake-employees.dto';
import { DrakeExpiringRequirementsDto } from './dto/drake-expiring-requirements.dto';
import { getRequestContext } from '../../common/http/request-context';
import type { Request } from 'express';

@Controller('integrations/drake')
@UseGuards(DrakeWebhookAuthGuard)
export class DrakeController {
  constructor(private readonly drakeWebhookService: DrakeWebhookService) {}

  @Post('employees')
  @HttpCode(202)
  receiveEmployees(
    @Body(
      new ValidationPipe({
        whitelist: false,
        forbidNonWhitelisted: false,
        transform: true,
      }),
    )
    payload: DrakeEmployeesDto,
    @Req() request: Request,
  ) {
    return this.drakeWebhookService.receive(
      'employees',
      payload as Record<string, unknown>,
      getRequestContext(request as Request & { id?: string }),
    );
  }

  @Post('expiring-requirements')
  @HttpCode(202)
  receiveExpiringRequirements(
    @Body(
      new ValidationPipe({
        whitelist: false,
        forbidNonWhitelisted: false,
        transform: true,
      }),
    )
    payload: DrakeExpiringRequirementsDto,
    @Req() request: Request,
  ) {
    return this.drakeWebhookService.receive(
      'expiring-requirements',
      payload as Record<string, unknown>,
      getRequestContext(request as Request & { id?: string }),
    );
  }

  @Post('boarding-schedule')
  @HttpCode(202)
  receiveBoardingSchedule(
    @Body(
      new ValidationPipe({
        whitelist: false,
        forbidNonWhitelisted: false,
        transform: true,
      }),
    )
    payload: DrakeBoardingScheduleDto,
    @Req() request: Request,
  ) {
    return this.drakeWebhookService.receive(
      'boarding-schedule',
      payload as Record<string, unknown>,
      getRequestContext(request as Request & { id?: string }),
    );
  }
}
