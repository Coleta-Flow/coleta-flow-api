import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'joao@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Senha@123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: '(85) 99999-0000' })
  @IsString()
  @IsOptional()
  phone?: string;
}
