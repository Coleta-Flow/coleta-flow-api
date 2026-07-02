import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { DriversService } from './drivers.service';
import { AssignVehicleDto, CreateDriverDto, UpdateDriverDto } from './dto/driver.dto';

@ApiTags('Drivers')
@ApiBearerAuth()
@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: 'List all drivers with vehicle assignment' })
  findAll() {
    return this.driversService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: 'Get driver by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.driversService.findById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: 'Create driver account and profile' })
  create(@Body() dto: CreateDriverDto) {
    return this.driversService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: 'Update driver profile' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDriverDto) {
    return this.driversService.update(id, dto);
  }

  @Patch(':id/assign-vehicle')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: 'Assign or unassign a vehicle to the driver' })
  assignVehicle(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignVehicleDto) {
    return this.driversService.assignVehicle(id, dto.vehicleId ?? null);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Deactivate driver (soft delete)' })
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.driversService.deactivate(id);
  }
}
