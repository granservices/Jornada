import { IsString, Length } from 'class-validator';

export class FindDrakeWorkerDto {
  @IsString()
  @Length(3, 120)
  q!: string;
}
