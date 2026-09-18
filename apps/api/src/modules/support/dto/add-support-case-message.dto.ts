import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AddSupportCaseMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  previewReference?: string;
}
