import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshSessionDto {
  @ApiProperty()
  @IsString()
  @MinLength(20)
  refreshToken!: string;
}
