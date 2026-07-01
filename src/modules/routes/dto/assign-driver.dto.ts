import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignDriverDto {
  @ApiProperty({ example: 'uuid-do-motorista', description: 'ID do motorista a ser atribuído' })
  @IsUUID()
  driverId: string;
}
