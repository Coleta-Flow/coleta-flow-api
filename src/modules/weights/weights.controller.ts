import { Controller, Post, Body, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsUUID, IsNumber, IsPositive, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { WeightsService } from './weights.service';

class RegisterWeightDto {
  @ApiProperty() @IsUUID() donorRequestId: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() routeId?: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() collectionPointId?: string;
  @ApiProperty({ example: 15.0 }) @IsNumber() @IsPositive() grossWeightKg: number;
  @ApiProperty({ example: 13.5 }) @IsNumber() @IsPositive() netWeightKg: number;
  @ApiPropertyOptional({ example: 1.5 }) @IsNumber() @IsPositive() @IsOptional() tareKg?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() photoUrl?: string;
}

@ApiTags('Weights')
@ApiBearerAuth()
@Controller('weights')
export class WeightsController {
  constructor(private readonly weightsService: WeightsService) {}

  @Post()
  @Roles(UserRole.DRIVER, UserRole.COLLECTION_POINT_OPERATOR, UserRole.OPERATOR)
  @ApiOperation({ summary: 'Register confirmed material weight' })
  @ApiResponse({ status: 201, description: 'Weight record created' })
  @ApiResponse({ status: 404, description: 'Donor request not found' })
  register(@Body() dto: RegisterWeightDto, @Request() req: any) {
    return this.weightsService.registerWeight({
      ...dto,
      confirmedByUserId: req.user.id,
    });
  }
}
