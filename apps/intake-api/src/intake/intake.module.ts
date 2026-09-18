import { Module } from '@nestjs/common';
import { IntakeAuthGuard } from './intake-auth.guard';
import { IntakeBodyService } from './intake-body.service';
import { IntakeClassifierService } from './intake-classifier.service';
import { IntakeController } from './intake.controller';
import { IntakeRawStorageService } from './intake-raw-storage.service';
import { IntakeService } from './intake.service';
import { IntakeSqliteService } from './intake-sqlite.service';
import { LegacyDrakeIntakeController } from './legacy-drake-intake.controller';

@Module({
  controllers: [IntakeController, LegacyDrakeIntakeController],
  providers: [
    IntakeAuthGuard,
    IntakeBodyService,
    IntakeClassifierService,
    IntakeRawStorageService,
    IntakeService,
    IntakeSqliteService,
  ],
})
export class IntakeModule {}
