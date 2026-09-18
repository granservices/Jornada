import {
  ChatParticipantRole,
  SupportCaseOpeningPolicy,
  SupportCasePriority,
  SupportCatalogStatus,
  SupportFormFieldType,
  SupportTeamStatus,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const activeOrInactiveStatus = [
  SupportCatalogStatus.ACTIVE,
  SupportCatalogStatus.INACTIVE,
];

export class UpsertSupportDepartmentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  code!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  description?: string;

  @IsOptional()
  @IsIn(activeOrInactiveStatus)
  status?: SupportCatalogStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999)
  sortOrder?: number;
}

export class UpsertSupportTopicDto {
  @IsString()
  @MaxLength(120)
  departmentId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(40)
  code!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  description?: string;

  @IsOptional()
  @IsIn(activeOrInactiveStatus)
  status?: SupportCatalogStatus;

  @IsOptional()
  @IsEnum(SupportCasePriority)
  defaultPriority?: SupportCasePriority;

  @IsOptional()
  @IsEnum(SupportCaseOpeningPolicy)
  openingPolicy?: SupportCaseOpeningPolicy;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  businessKeyFieldCode?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999)
  sortOrder?: number;
}

export class UpsertSupportTeamDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  departmentId?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(40)
  code!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsEnum(SupportTeamStatus)
  status?: SupportTeamStatus;
}

export class UpsertSupportRoutingRuleDto {
  @IsString()
  @MaxLength(120)
  departmentId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  topicId?: string;

  @IsString()
  @MaxLength(120)
  teamId!: string;

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
}

export class UpsertSupportTeamMemberDto {
  @IsString()
  @MaxLength(120)
  teamId!: string;

  @IsString()
  @MaxLength(120)
  userId!: string;

  @IsOptional()
  @IsEnum(ChatParticipantRole)
  role?: ChatParticipantRole;

  @IsOptional()
  @IsIn(activeOrInactiveStatus)
  status?: SupportCatalogStatus;
}

export class UpsertSupportTopicFieldDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  code!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  label!: string;

  @IsEnum(SupportFormFieldType)
  type!: SupportFormFieldType;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsBoolean()
  sensitive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  helpText?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  options?: string[];

  @IsOptional()
  @IsObject()
  visibleWhen?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  requiredWhen?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999)
  sortOrder?: number;
}

export class UpsertSupportTopicFormDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  description?: string;

  @IsOptional()
  @IsIn(activeOrInactiveStatus)
  status?: SupportCatalogStatus;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertSupportTopicFieldDto)
  fields!: UpsertSupportTopicFieldDto[];
}
