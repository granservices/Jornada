import { Module } from '@nestjs/common';
import { EmployeesIngestionService } from './services/employees-ingestion.service';

@Module({
  providers: [EmployeesIngestionService],
  exports: [EmployeesIngestionService],
})
export class EmployeesModule {}
