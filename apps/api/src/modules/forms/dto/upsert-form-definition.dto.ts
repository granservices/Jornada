import {
  FormOwnerType,
  SupportCatalogStatus,
  SupportFormFieldType,
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

const writableFormStatuses = [
  SupportCatalogStatus.ACTIVE,
  SupportCatalogStatus.DRAFT,
];

export class UpsertFormFieldDto {
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
  options?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(80)
  optionSourceKey?: string;

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

export class UpsertFormDefinitionDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  key?: string;

  @IsOptional()
  @IsEnum(FormOwnerType)
  ownerType?: FormOwnerType;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  ownerDepartmentId?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  description?: string;

  @IsOptional()
  @IsIn(writableFormStatuses)
  status?: SupportCatalogStatus;

  @IsOptional()
  @IsObject()
  schema?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertFormFieldDto)
  fields?: UpsertFormFieldDto[];
}
