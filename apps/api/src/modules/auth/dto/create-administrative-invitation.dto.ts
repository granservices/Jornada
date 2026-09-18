import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

const ACCESS_CHANGE_REASONS = [
  'ONBOARDING',
  'ROLE_CHANGE',
  'SECURITY',
  'OFFBOARDING',
  'ACCESS_CORRECTION',
  'OTHER',
] as const;

export class InvitationApplicationGrantDto {
  @IsString()
  @MaxLength(50)
  code!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  roles!: string[];

  @IsOptional()
  isDefault?: boolean;
}

export class CreateAdministrativeInvitationDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  fullName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  employeeId?: string;

  @IsEnum(ACCESS_CHANGE_REASONS)
  reason!: (typeof ACCESS_CHANGE_REASONS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reasonComment?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvitationApplicationGrantDto)
  applications!: InvitationApplicationGrantDto[];
}
