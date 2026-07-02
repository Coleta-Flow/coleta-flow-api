import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsEnum, IsOptional, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'João Silva' })
  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'joao@email.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '(85) 99999-0000' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}

export class ChangePasswordDto {
  @ApiPropertyOptional({ description: 'Senha atual (obrigatória se não for admin)' })
  @IsString()
  @IsOptional()
  currentPassword?: string;

  @ApiPropertyOptional({ example: 'NovaSenha@456', minLength: 6 })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
