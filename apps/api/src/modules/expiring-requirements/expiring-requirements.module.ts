import { Module } from '@nestjs/common';
import { ExpiringRequirementsIngestionService } from './services/expiring-requirements-ingestion.service';

@Module({
  providers: [ExpiringRequirementsIngestionService],
  exports: [ExpiringRequirementsIngestionService],
})
export class ExpiringRequirementsModule {}
