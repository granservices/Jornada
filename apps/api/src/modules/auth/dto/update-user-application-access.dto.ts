import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
} from 'class-validator';
import type { ApplicationRoleCode } from '@prisma/client';

const APPLICATION_ROLE_CODES = [
  'MEMBER',
  'REQUESTER',
  'AGENT',
  'MANAGER',
  'VIEWER',
  'AUTHOR',
  'PUBLISHER',
] as const;

export class UpdateUserApplicationAccessDto {
  @Type(() => Boolean)
  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isDefault?: boolean;

  @IsArray()
  @ArrayUnique()
  @IsEnum(APPLICATION_ROLE_CODES, { each: true })
  roles!: ApplicationRoleCode[];
}
