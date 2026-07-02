import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, MinLength } from 'class-validator';

export class CreateDriverDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'motorista@ecologi.com.br' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: '(85) 98888-0003' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: '12345678900' })
  @IsString()
  @IsOptional()
  licenseNumber?: string;

  @ApiPropertyOptional({ description: 'Veículo já cadastrado na frota' })
  @IsString()
  @IsOptional()
  vehicleId?: string;
}

export class UpdateDriverDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  licenseNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  active?: boolean;
}

export class AssignVehicleDto {
  @ApiPropertyOptional({ description: 'ID do veículo ou null para desvincular' })
  @IsString()
  @IsOptional()
  vehicleId?: string | null;
}
