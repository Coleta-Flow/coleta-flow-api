import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CancelRouteDto {
  @ApiPropertyOptional({ example: 'Motorista indisponível', description: 'Motivo do cancelamento' })
  @IsString()
  @IsOptional()
  reason?: string;
}
