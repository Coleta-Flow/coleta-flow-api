import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsHexColor } from 'class-validator';

export class UpdateCompanySettingsDto {
  @ApiPropertyOptional({ example: 'EcoLogi Reciclagem' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ example: '#10B981' })
  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @ApiPropertyOptional({ example: '#047857' })
  @IsOptional()
  @IsHexColor()
  accentColor?: string;

  @ApiPropertyOptional({
    example: 'Este documento é gerado automaticamente pelo sistema EcoLogi...',
  })
  @IsOptional()
  @IsString()
  legalText?: string;
}
