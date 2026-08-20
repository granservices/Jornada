import { IsOptional, IsString } from 'class-validator';

export class DrakeWebhookBaseDto {
  @IsOptional()
  @IsString()
  event?: string;

  @IsOptional()
  @IsString()
  eventName?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  codigoEvento?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  colaboradorId?: string;

  @IsOptional()
  @IsString()
  matricula?: string;
}
