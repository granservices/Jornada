import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class RateSupportCaseDto {
  @IsInt()
  @Min(1)
  @Max(5)
  score!: number;

  @IsOptional()
  @IsString()
  @MaxLength(800)
  comment?: string;
}
