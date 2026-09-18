import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

const ACCESS_CHANGE_REASONS = [
  'ONBOARDING',
  'ROLE_CHANGE',
  'SECURITY',
  'OFFBOARDING',
  'ACCESS_CORRECTION',
  'OTHER',
] as const;

export class RevokeManagedUserSessionsDto {
  @IsEnum(ACCESS_CHANGE_REASONS)
  reason!: (typeof ACCESS_CHANGE_REASONS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reasonComment?: string;
}
