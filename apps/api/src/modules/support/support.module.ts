import { Module } from '@nestjs/common';
import { JwtAccessTokenService } from '../../common/auth/jwt-access-token.service';
import { AuditModule } from '../../common/audit/audit.module';
import { DomainEventsModule } from '../../common/events/domain-events.module';
import { PrismaModule } from '../../database/prisma.module';
import { BoardingScheduleModule } from '../boarding-schedule/boarding-schedule.module';
import { SupportCaseCodeFactory } from './factories/support-case-code.factory';
import { HelpHubFormCompletionConsumer } from './help-hub-form-completion.consumer';
import { SupportTextPolicyService } from './services/support-text-policy.service';
import { SupportSlaService } from './services/support-sla.service';
import { SupportSlaPolicyService } from './services/support-sla-policy.service';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';

@Module({
  imports: [AuditModule, DomainEventsModule, PrismaModule, BoardingScheduleModule],
  controllers: [SupportController],
  providers: [
    SupportService,
    SupportCaseCodeFactory,
    SupportTextPolicyService,
    SupportSlaService,
    SupportSlaPolicyService,
    HelpHubFormCompletionConsumer,
    JwtAccessTokenService,
  ],
})
export class SupportModule {}
