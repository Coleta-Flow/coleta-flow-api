import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsEnum, IsOptional, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
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

  @ApiProperty({ enum: UserRole, example: UserRole.OPERATOR })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiPropertyOptional({ example: '(85) 99999-0000' })
  @IsString()
  @IsOptional()
  phone?: string;
}
