import { IsOptional, IsString } from 'class-validator';
import { DrakeWebhookBaseDto } from './drake-webhook-base.dto';

export class DrakeExpiringRequirementsDto extends DrakeWebhookBaseDto {
  @IsOptional()
  @IsString()
  requirementId?: string;

  @IsOptional()
  @IsString()
  asoId?: string;

  @IsOptional()
  @IsString()
  trainingId?: string;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  category?: string;
}
