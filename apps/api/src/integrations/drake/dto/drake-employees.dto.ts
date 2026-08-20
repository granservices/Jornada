import { IsOptional, IsString } from 'class-validator';
import { DrakeWebhookBaseDto } from './drake-webhook-base.dto';

export class DrakeEmployeesDto extends DrakeWebhookBaseDto {
  @IsOptional()
  @IsString()
  employeeCode?: string;

  @IsOptional()
  @IsString()
  cpf?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
