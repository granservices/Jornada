import {
  IsISO8601,
  IsNotEmptyObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateFormRequestDto {
  @IsString()
  @MinLength(1)
  formId!: string;

  @IsString()
  @MinLength(1)
  respondentUserId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  sourceApplication!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  sourceContextType!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  sourceContextId!: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  dueAt?: string;
}

export class SubmitFormResponseDto {
  @IsNotEmptyObject()
  values!: Record<string, unknown>;
}
