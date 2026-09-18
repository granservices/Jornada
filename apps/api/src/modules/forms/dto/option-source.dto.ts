import { OptionSourceAdapterType, OptionSourceStatus } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateOptionSourceDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  key!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsEnum(OptionSourceAdapterType)
  adapterType!: OptionSourceAdapterType;

  @IsObject()
  config!: Record<string, unknown>;

  @IsOptional()
  @IsEnum(OptionSourceStatus)
  status?: OptionSourceStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(86400)
  cacheTtlSeconds?: number;
}

export class UpdateOptionSourceDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsEnum(OptionSourceAdapterType)
  adapterType!: OptionSourceAdapterType;

  @IsObject()
  config!: Record<string, unknown>;

  @IsOptional()
  @IsEnum(OptionSourceStatus)
  status?: OptionSourceStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(86400)
  cacheTtlSeconds?: number;
}

export class PreviewOptionSourceDto {
  @IsEnum(OptionSourceAdapterType)
  adapterType!: OptionSourceAdapterType;

  @IsObject()
  config!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
