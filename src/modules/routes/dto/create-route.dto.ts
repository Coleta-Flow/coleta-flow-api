import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional } from 'class-validator';

export class CreateRouteDto {
  @ApiProperty({ example: 'uuid-da-solicitacao', description: 'ID da solicitação do doador' })
  @IsUUID()
  donorRequestId: string;

  @ApiPropertyOptional({ example: 'uuid-do-motorista', description: 'ID do motorista (opcional)' })
  @IsUUID()
  @IsOptional()
  driverId?: string;
}
