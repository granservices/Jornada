import { SupportCasePriority } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateSupportCaseFieldValueDto {
  @IsString()
  @MaxLength(120)
  fieldId!: string;

  @IsString()
  @MaxLength(2000)
  value!: string;
}

export class CreateSupportCaseDto {
  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(140)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  teamCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  departmentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  topicId?: string;

  @IsOptional()
  @IsEnum(SupportCasePriority)
  priority?: SupportCasePriority;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSupportCaseFieldValueDto)
  fieldValues?: CreateSupportCaseFieldValueDto[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  previewReference?: string;
}
