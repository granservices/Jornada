import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'colaborador@granservices.com.br' })
  @IsEmail()
  email!: string;
}
