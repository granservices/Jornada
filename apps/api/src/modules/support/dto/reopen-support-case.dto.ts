import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { SupportReopenReason } from './support-case-change-reason';

export class ReopenSupportCaseDto {
  @IsEnum(SupportReopenReason)
  reason!: SupportReopenReason;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message!: string;
}
