import { IsDateString, IsOptional } from 'class-validator';

export class ListEmployeeScheduleDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
