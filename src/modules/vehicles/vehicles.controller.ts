import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto';

@ApiTags('Vehicles')
@ApiBearerAuth()
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: 'List fleet vehicles' })
  @ApiQuery({ name: 'available', required: false, type: Boolean })
  findAll(@Query('available') available?: string) {
    const onlyAvailable = available === 'true' || available === '1';
    return this.vehiclesService.findAll(onlyAvailable);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: 'Get vehicle by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.vehiclesService.findById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: 'Register a new vehicle' })
  create(@Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: 'Update vehicle data' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateVehicleDto) {
    return this.vehiclesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Deactivate vehicle (soft delete)' })
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.vehiclesService.deactivate(id);
  }
}
