import { SupportCaseStatus } from '@prisma/client';
import {
  IsBooleanString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ListSupportCasesDto {
  @IsOptional()
  @IsIn([
    'novos-e-meus',
    'nao-atribuidos',
    'meus-atendimentos',
    'aguardando',
    'alta-prioridade',
    'resolvidos',
  ])
  queue?:
    | 'novos-e-meus'
    | 'nao-atribuidos'
    | 'meus-atendimentos'
    | 'aguardando'
    | 'alta-prioridade'
    | 'resolvidos';

  @IsOptional()
  @IsEnum(SupportCaseStatus)
  status?: SupportCaseStatus;

  @IsOptional()
  @IsIn(['active', 'waiting', 'resolved'])
  state?: 'active' | 'waiting' | 'resolved';

  @IsOptional()
  @IsString()
  @MaxLength(80)
  teamCode?: string;

  @IsOptional()
  @IsBooleanString()
  mine?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  previewReference?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  limit?: number;
}
