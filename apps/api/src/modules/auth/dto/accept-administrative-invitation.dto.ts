import { IsString, IsStrongPassword, MaxLength } from 'class-validator';

export class AcceptAdministrativeInvitationDto {
  @IsString()
  @MaxLength(512)
  token!: string;

  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  password!: string;
}
