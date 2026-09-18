import { Module } from '@nestjs/common';
import { JwtAccessTokenService } from '../../common/auth/jwt-access-token.service';
import { AuditModule } from '../../common/audit/audit.module';
import { DomainEventsModule } from '../../common/events/domain-events.module';
import { PrismaModule } from '../../database/prisma.module';
import { FormsController } from './forms.controller';
import { FormsService } from './forms.service';
import { FormRequestsService } from './form-requests.service';
import { HttpJsonOptionSourceAdapter, StaticOptionSourceAdapter } from './option-source-adapters';
import { OptionSourceService } from './option-source.service';

@Module({
  imports: [AuditModule, DomainEventsModule, PrismaModule],
  controllers: [FormsController],
  providers: [
    FormsService,
    FormRequestsService,
    JwtAccessTokenService,
    OptionSourceService,
    StaticOptionSourceAdapter,
    HttpJsonOptionSourceAdapter,
  ],
  exports: [FormsService, FormRequestsService],
})
export class FormsModule {}
