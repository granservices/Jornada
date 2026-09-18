import { IsString, Matches } from 'class-validator';

export class CreateSsoTicketDto {
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]{1,63}$/)
  applicationCode!: string;
}
