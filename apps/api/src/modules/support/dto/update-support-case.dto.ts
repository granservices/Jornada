import { SupportCasePriority, SupportCaseStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  SupportResolutionReason,
  SupportTransferReason,
} from './support-case-change-reason';

export class UpdateSupportCaseDto {
  @IsOptional()
  @IsEnum(SupportCaseStatus)
  status?: SupportCaseStatus;

  @IsOptional()
  @IsEnum(SupportCasePriority)
  priority?: SupportCasePriority;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  teamCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  assignedUserId?: string;

  @IsOptional()
  @IsEnum({ ...SupportTransferReason, ...SupportResolutionReason })
  changeReason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  changeComment?: string;
}
