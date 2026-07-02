import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsNumber,
  IsPositive,
  MinLength,
  IsOptional,
  IsArray,
  ArrayMinSize,
} from 'class-validator';

export class CreateDonorPortalRequestDto {
  @ApiProperty({ example: 'uuid-do-tipo-de-material' })
  @IsUUID()
  materialTypeId: string;

  @ApiProperty({ example: 'Caixas de papelão, garrafas PET e latas de alumínio' })
  @IsString()
  @MinLength(10)
  description: string;

  @ApiPropertyOptional({ example: 15.5 })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  estimatedWeightKg?: number;

  @ApiProperty({ example: 'Tarde, após as 14h' })
  @IsString()
  bestTimeForPickup: string;

  @ApiPropertyOptional({ example: ['uuid-foto-1'] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(0)
  photoIds?: string[];
}
