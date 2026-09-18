import { IsString, Length } from 'class-validator';

export class ConsumeSsoTicketDto {
  @IsString()
  @Length(64, 256)
  ticket!: string;
}
