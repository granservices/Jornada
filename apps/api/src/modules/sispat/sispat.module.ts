import { Module } from '@nestjs/common';
import { SispatController } from './sispat.controller';
import { SispatEmployeesCsvService } from './services/sispat-employees-csv.service';

@Module({
  controllers: [SispatController],
  providers: [SispatEmployeesCsvService],
})
export class SispatModule {}
