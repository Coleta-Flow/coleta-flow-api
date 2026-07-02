import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsString } from 'class-validator';

export class AcceptDemandDto {
  @ApiProperty({ description: 'ID da solicitação aprovada para coleta' })
  @IsUUID()
  donorRequestId: string;

  @ApiPropertyOptional({ description: 'Ponto de coleta de destino' })
  @IsUUID()
  @IsOptional()
  collectionPointId?: string;
}

export class CancelRouteDto {
  @ApiPropertyOptional({ description: 'Motivo do cancelamento' })
  @IsString()
  @IsOptional()
  reason?: string;
}
