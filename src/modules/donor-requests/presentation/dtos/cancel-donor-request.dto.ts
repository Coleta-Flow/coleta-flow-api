import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CancelDonorRequestDto {
  @ApiPropertyOptional({ example: 'Doador não estava disponível no horário combinado' })
  @IsOptional()
  @IsString()
  reason?: string;
}
