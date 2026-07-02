import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, IsNumber, Min } from 'class-validator';

export class CreateVehicleDto {
  @ApiProperty({ example: 'ABC-1234' })
  @IsString()
  @MinLength(5)
  plate: string;

  @ApiProperty({ example: 'Fiorino' })
  @IsString()
  @MinLength(2)
  model: string;

  @ApiPropertyOptional({ example: 'Fiat' })
  @IsString()
  @IsOptional()
  brand?: string;

  @ApiPropertyOptional({ example: 800 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  capacityKg?: number;
}

export class UpdateVehicleDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MinLength(5)
  plate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MinLength(2)
  model?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  brand?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  capacityKg?: number;

  @ApiPropertyOptional()
  @IsOptional()
  active?: boolean;
}
