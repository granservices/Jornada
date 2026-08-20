import { IsOptional, IsString } from 'class-validator';
import { DrakeWebhookBaseDto } from './drake-webhook-base.dto';

export class DrakeBoardingScheduleDto extends DrakeWebhookBaseDto {
  @IsOptional()
  @IsString()
  embarqueId?: string;

  @IsOptional()
  @IsString()
  programacaoId?: string;

  @IsOptional()
  @IsString()
  scheduleId?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
