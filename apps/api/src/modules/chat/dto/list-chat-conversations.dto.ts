import { ChatSector } from '@prisma/client';
import {
  IsBooleanString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ListChatConversationsDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  teamCode?: string;

  @IsOptional()
  @IsEnum(ChatSector)
  sector?: ChatSector;

  @IsOptional()
  @IsBooleanString()
  unread?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  limit?: number;
}
