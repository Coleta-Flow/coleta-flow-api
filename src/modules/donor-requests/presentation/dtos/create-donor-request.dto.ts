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
  IsArray,
  ArrayMinSize,
} from 'class-validator';

export class CreateDonorRequestDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @MinLength(3)
  name: string;

  @ApiProperty({ example: '(85) 99999-0000', description: 'WhatsApp com DDD' })
  @IsString()
  @Matches(/^\(\d{2}\) \d{4,5}-\d{4}$/, {
    message: 'WhatsApp deve estar no formato (DD) NNNNN-NNNN',
  })
  whatsapp: string;

  @ApiProperty({ example: 'joao@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456', description: 'Senha para acesso ao portal do doador' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: '123.456.789-00' })
  @IsString()
  @IsOptional()
  cpfCnpj?: string;

  @ApiPropertyOptional({ example: '60175-000' })
  @IsString()
  @IsOptional()
  cep?: string;

  @ApiProperty({ example: 'Rua das Flores' })
  @IsString()
  @MinLength(2)
  street: string;

  @ApiProperty({ example: '123' })
  @IsString()
  @MinLength(1)
  number: string;

  @ApiPropertyOptional({ example: 'Apto 101' })
  @IsString()
  @IsOptional()
  complement?: string;

  @ApiPropertyOptional({ example: 'Centro' })
  @IsString()
  @IsOptional()
  neighborhood?: string;

  @ApiProperty({ example: 'Fortaleza' })
  @IsString()
  city: string;

  @ApiPropertyOptional({ example: 'CE' })
  @IsString()
  @IsOptional()
  state?: string;

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

  @ApiPropertyOptional({
    example: ['uuid-foto-1', 'uuid-foto-2'],
    description: 'IDs dos arquivos enviados via /files/upload/public (RF07)',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(0)
  photoIds?: string[];
}
