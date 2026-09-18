import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

const MANAGED_USER_STATUSES = ['ACTIVE', 'BLOCKED', 'DISABLED'] as const;
const ACCESS_CHANGE_REASONS = [
  'ONBOARDING',
  'ROLE_CHANGE',
  'SECURITY',
  'OFFBOARDING',
  'ACCESS_CORRECTION',
  'OTHER',
] as const;

export class UpdateManagedUserStatusDto {
  @IsEnum(MANAGED_USER_STATUSES)
  status!: (typeof MANAGED_USER_STATUSES)[number];

  @IsEnum(ACCESS_CHANGE_REASONS)
  reason!: (typeof ACCESS_CHANGE_REASONS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reasonComment?: string;
}
