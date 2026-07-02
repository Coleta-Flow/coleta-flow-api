import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsString, IsNumber, IsInt, Min, Max } from 'class-validator';

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

export class SendLocationDto {
  @ApiProperty({ example: -3.7319 })
  @IsNumber()
  lat: number;

  @ApiProperty({ example: -38.5267 })
  @IsNumber()
  lng: number;

  @ApiPropertyOptional({ description: 'Precisão do GPS em metros' })
  @IsNumber()
  @IsOptional()
  accuracy?: number;

  @ApiPropertyOptional({ description: 'Velocidade em m/s' })
  @IsNumber()
  @IsOptional()
  speed?: number;

  @ApiPropertyOptional({ description: 'Direção em graus (0-360)' })
  @IsInt()
  @Min(0)
  @Max(360)
  @IsOptional()
  heading?: number;

  @ApiPropertyOptional({ description: 'Nível de bateria do dispositivo (0-100)' })
  @IsInt()
  @IsOptional()
  battery?: number;
}

export class DeliverToPointDto {
  @ApiProperty({ description: 'ID do ponto de coleta de destino' })
  @IsUUID()
  collectionPointId: string;

  @ApiProperty({ example: -3.7319, description: 'Latitude atual do motorista (validada contra o geofence)' })
  @IsNumber()
  driverLat: number;

  @ApiProperty({ example: -38.5267, description: 'Longitude atual do motorista (validada contra o geofence)' })
  @IsNumber()
  driverLng: number;
}
