import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { UserProfileNotificationChannel } from '@prisma/client';

export class UpdateMyProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  preferredName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phoneNumber?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  emergencyContactName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  emergencyContactPhone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  primaryBase?: string | null;

  @IsOptional()
  @IsEnum(UserProfileNotificationChannel)
  notificationChannel?: UserProfileNotificationChannel;
}
