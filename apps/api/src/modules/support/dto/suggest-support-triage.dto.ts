import { IsString, MaxLength, MinLength } from 'class-validator';

export class SuggestSupportTriageDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  text!: string;
}
