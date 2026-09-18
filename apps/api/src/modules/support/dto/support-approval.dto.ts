import { ApprovalStepStatus, SupportCatalogStatus } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const activeOrInactiveStatus = [
  SupportCatalogStatus.ACTIVE,
  SupportCatalogStatus.INACTIVE,
];

export class UpsertApprovalRuleDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  departmentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  topicId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  formId?: string;

  @IsString()
  @MaxLength(120)
  approvalTeamId!: string;

  @IsOptional()
  @IsIn(activeOrInactiveStatus)
  status?: SupportCatalogStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(999)
  priority?: number;

  @IsOptional()
  @IsObject()
  conditions?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60 * 24 * 30)
  defaultDueMinutes?: number;

  @IsOptional()
  @IsBoolean()
  manualTriggerAllowed?: boolean;
}

export class DecideApprovalDto {
  @IsEnum(ApprovalStepStatus)
  decision!: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

export class RequestManualApprovalDto {
  @IsString()
  @MaxLength(120)
  approvalTeamId!: string;

  @IsString()
  @MinLength(4)
  @MaxLength(1000)
  reason!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60 * 24 * 30)
  dueMinutes?: number;
}
