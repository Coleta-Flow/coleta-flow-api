import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsString } from 'class-validator';

export class CreateRouteDto {
  @ApiProperty({ description: 'ID da solicitação aprovada para coleta' })
  @IsUUID()
  donorRequestId: string;

  @ApiPropertyOptional({ description: 'ID do motorista (opcional — pode atribuir depois)' })
  @IsUUID()
  @IsOptional()
  driverId?: string;

  @ApiPropertyOptional({ description: 'Ponto de coleta de destino (usa o da decisão ou da cidade)' })
  @IsUUID()
  @IsOptional()
  collectionPointId?: string;
}

export class AssignDriverDto {
  @ApiProperty({ description: 'ID do motorista a atribuir' })
  @IsUUID()
  driverId: string;
}

export class CancelRouteDto {
  @ApiPropertyOptional({ description: 'Motivo do cancelamento' })
  @IsString()
  @IsOptional()
  reason?: string;
}
