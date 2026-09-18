import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsStrongPassword,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'colaborador@granservices.com.br' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Luan Xavier', minLength: 3, maxLength: 120 })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  fullName!: string;

  @ApiPropertyOptional({
    example: '000123',
    description: 'Matricula operacional do colaborador, quando ja conhecida.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  employeeId?: string;

  @ApiProperty({
    minLength: 8,
    description:
      'Precisa conter letras maiusculas, minusculas, numero e simbolo.',
  })
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  password!: string;
}
