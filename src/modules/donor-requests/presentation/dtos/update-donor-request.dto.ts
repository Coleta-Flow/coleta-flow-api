import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
} from 'class-validator';

export class UpdateDonorRequestDto {
  @ApiPropertyOptional({ example: 'Caixas de papelão e garrafas PET' })
  @IsOptional()
  @IsString()
  @MinLength(5)
  description?: string;

  @ApiPropertyOptional({ example: 12.5, description: 'Peso estimado em kg' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  estimatedWeightKg?: number;

  @ApiPropertyOptional({ example: 'Tarde, após as 15h' })
  @IsOptional()
  @IsString()
  bestTimeForPickup?: string;

  @ApiPropertyOptional({ example: 'Cliente confirmou horário por WhatsApp' })
  @IsOptional()
  @IsString()
  operatorNotes?: string;
}
