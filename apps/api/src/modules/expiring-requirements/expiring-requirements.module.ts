import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module';
import { JwtAccessTokenService } from '../../common/auth/jwt-access-token.service';
import { BoardingScheduleModule } from '../boarding-schedule/boarding-schedule.module';
import { ExpiringRequirementsController } from './expiring-requirements.controller';
import { DrakeQualificationNeedsClient } from './services/drake-qualification-needs.client';
import { EmployeeRequirementsService } from './services/employee-requirements.service';
import { ExpiringRequirementsIngestionService } from './services/expiring-requirements-ingestion.service';

@Module({
  imports: [AuditModule, BoardingScheduleModule],
  controllers: [ExpiringRequirementsController],
  providers: [
    DrakeQualificationNeedsClient,
    EmployeeRequirementsService,
    ExpiringRequirementsIngestionService,
    JwtAccessTokenService,
  ],
  exports: [ExpiringRequirementsIngestionService],
})
export class ExpiringRequirementsModule {}
