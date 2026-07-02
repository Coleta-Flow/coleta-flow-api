import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional } from 'class-validator';

export class SocialLoginDto {
  @ApiProperty({ description: 'Token retornado pelo provider (Google/Facebook)' })
  @IsString()
  token: string;

  @ApiPropertyOptional({ example: 'João Silva' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'joao@gmail.com' })
  @IsEmail()
  @IsOptional()
  email?: string;
}
