import { Module } from '@nestjs/common';
import { BoardingScheduleIngestionService } from './services/boarding-schedule-ingestion.service';

@Module({
  providers: [BoardingScheduleIngestionService],
  exports: [BoardingScheduleIngestionService],
})
export class BoardingScheduleModule {}
