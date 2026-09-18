import { IsString, Length } from 'class-validator';

export class ListDrakeWorkerRequirementsDto {
  @IsString()
  @Length(40, 600)
  previewReference!: string;
}
