import { Controller, Get, HttpCode, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { IntakeAuthGuard } from './intake-auth.guard';
import { IntakeService } from './intake.service';

@Controller('intake')
@UseGuards(IntakeAuthGuard)
export class IntakeController {
  constructor(private readonly intakeService: IntakeService) {}

  @Post('events')
  @HttpCode(202)
  receiveEvent(@Req() request: Request) {
    return this.intakeService.receive(request);
  }

  @Get('events')
  listEvents(
    @Query('eventType') eventType?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.intakeService.list({ eventType, status, limit });
  }

  @Get('summary')
  getSummary() {
    return this.intakeService.summary();
  }

  @Get('qualification-preview')
  getQualificationPreview(@Query('days') days?: string) {
    return this.intakeService.qualificationPreview(days);
  }
}
