import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, IsIn } from 'class-validator';

export class CreateMaterialTypeDto {
  @ApiProperty({ example: 'Plástico' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: 'Garrafas PET, embalagens plásticas em geral' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'kg', description: 'Unidade de medida: kg, m³, un' })
  @IsOptional()
  @IsString()
  @IsIn(['kg', 'm³', 'un', 'l'], { message: 'Unidade deve ser kg, m³, un ou l' })
  unitOfMeasure?: string;
}
