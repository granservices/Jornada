import { IsDateString, IsString, Length } from 'class-validator';

export class ListDrakeWorkerScheduleDto {
  @IsString()
  @Length(40, 600)
  previewReference!: string;

  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;
}
