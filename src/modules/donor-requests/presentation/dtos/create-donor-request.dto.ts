import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsUUID,
  IsNumber,
  IsPositive,
  MinLength,
  Matches,
} from 'class-validator';

export class CreateDonorRequestDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @MinLength(3)
  name: string;

  @ApiProperty({ example: '(85) 99999-0000', description: 'WhatsApp com DDD' })
  @IsString()
  @Matches(/^\(\d{2}\) \d{4,5}-\d{4}$/, { message: 'WhatsApp deve estar no formato (DD) NNNNN-NNNN' })
  whatsapp: string;

  @ApiPropertyOptional({ example: 'joao@email.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'Rua das Flores, 123, Bairro Centro' })
  @IsString()
  @MinLength(5)
  address: string;

  @ApiProperty({ example: 'Fortaleza' })
  @IsString()
  city: string;

  @ApiProperty({ example: 'uuid-do-tipo-de-material' })
  @IsUUID()
  materialTypeId: string;

  @ApiProperty({ example: 'Caixas de papelão, garrafas PET e latas de alumínio' })
  @IsString()
  @MinLength(10)
  description: string;

  @ApiPropertyOptional({ example: 15.5, description: 'Peso estimado em kg' })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  estimatedWeightKg?: number;

  @ApiProperty({ example: 'Tarde, após as 14h' })
  @IsString()
  bestTimeForPickup: string;
}
