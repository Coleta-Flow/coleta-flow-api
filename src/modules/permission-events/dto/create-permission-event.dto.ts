import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional } from 'class-validator';
import { PermissionType, PermissionEventStatus } from '@prisma/client';

export class CreatePermissionEventDto {
  @ApiProperty({ enum: PermissionType })
  @IsEnum(PermissionType)
  permissionType: PermissionType;

  @ApiProperty({ enum: PermissionEventStatus })
  @IsEnum(PermissionEventStatus)
  status: PermissionEventStatus;

  @ApiProperty({ example: 'android' })
  @IsString()
  platform: string;

  @ApiPropertyOptional({ example: '14' })
  @IsString()
  @IsOptional()
  osVersion?: string;

  @ApiPropertyOptional({ example: '0.1.0' })
  @IsString()
  @IsOptional()
  appVersion?: string;
}
