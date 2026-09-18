import { Module } from '@nestjs/common';
import { JwtAccessTokenService } from '../../common/auth/jwt-access-token.service';
import { AuditModule } from '../../common/audit/audit.module';
import { PrismaModule } from '../../database/prisma.module';
import { BoardingScheduleController } from './boarding-schedule.controller';
import { BoardingScheduleIngestionService } from './services/boarding-schedule-ingestion.service';
import { DrakeCrewRotationClient } from './services/drake-crew-rotation.client';
import { EmployeeScheduleService } from './services/employee-schedule.service';
import { DrakeSchedulePreviewReferenceService } from './services/drake-schedule-preview-reference.service';

@Module({
  imports: [AuditModule, PrismaModule],
  controllers: [BoardingScheduleController],
  providers: [
    BoardingScheduleIngestionService,
    DrakeCrewRotationClient,
    DrakeSchedulePreviewReferenceService,
    EmployeeScheduleService,
    JwtAccessTokenService,
  ],
  exports: [
    BoardingScheduleIngestionService,
    EmployeeScheduleService,
    DrakeCrewRotationClient,
    DrakeSchedulePreviewReferenceService,
  ],
})
export class BoardingScheduleModule {}
