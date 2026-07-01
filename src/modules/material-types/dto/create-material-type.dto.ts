import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength } from 'class-validator';

export class CreateMaterialTypeDto {
  @ApiProperty({ example: 'Plástico' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: 'Garrafas PET, embalagens plásticas em geral' })
  @IsString()
  @IsOptional()
  description?: string;
}
