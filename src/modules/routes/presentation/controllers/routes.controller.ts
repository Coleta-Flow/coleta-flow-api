import {
  Controller, Get, Post, Patch,
  Param, Body, Request, ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { RoutesService } from '../../routes.service';
import { CreateRouteDto, AssignDriverDto, CancelRouteDto } from '../../dto/route.dto';

@ApiTags('Routes')
@ApiBearerAuth()
@Controller('routes')
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Get()
  @Roles(UserRole.OPERATOR, UserRole.ADMIN, UserRole.DRIVER)
  @ApiOperation({ summary: 'List routes (DRIVER sees only assigned routes)' })
  findAll(@Request() req: any) {
    const driverId = req.user.role === UserRole.DRIVER ? req.user.id : undefined;
    return this.routesService.findAll(driverId);
  }

  @Post()
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new route from an approved donor request' })
  @ApiResponse({ status: 201, description: 'Route created' })
  create(@Body() dto: CreateRouteDto) {
    return this.routesService.createRoute(dto.donorRequestId, dto.driverId);
  }

  @Get(':id')
  @Roles(UserRole.OPERATOR, UserRole.ADMIN, UserRole.DRIVER)
  @ApiOperation({ summary: 'Get route details with stops, driver and tracking session' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.routesService.getRouteById(id);
  }

  @Patch(':id/assign-driver')
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Assign (or reassign) a driver to a planned route' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  assignDriver(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignDriverDto,
  ) {
    return this.routesService.assignDriver(id, dto.driverId);
  }

  @Patch(':id/start')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Start route — generates tracking token' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Route started, tracking token returned' })
  startRoute(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.routesService.startRoute(id, req.user.id);
  }

  @Patch(':id/arrive-at-donor')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Driver confirms arrival at donor location' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  arriveAtDonor(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.routesService.confirmArrivalAtDonor(id, req.user.id);
  }

  @Patch(':id/collect')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Driver confirms material collection at donor' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  collect(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.routesService.confirmCollection(id, req.user.id);
  }

  @Patch(':id/finish')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Finish route after delivery to collection point' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  finish(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.routesService.finishRoute(id, req.user.id);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Cancel a route (PLANNED, ASSIGNED or IN_PROGRESS)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelRouteDto,
  ) {
    return this.routesService.cancelRoute(id, dto.reason);
  }

  @Post(':id/location')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Send driver GPS location — saved to Redis, emitted via WebSocket' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  sendLocation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: {
      lat: number; lng: number;
      accuracy?: number; speed?: number;
      heading?: number; battery?: number;
    },
  ) {
    return this.routesService.sendLocation(id, body);
  }

  @Patch(':id/deliver-to-point')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Confirm delivery at collection point (validates geofence)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 403, description: 'GEOFENCE_VIOLATION — driver outside allowed radius' })
  deliverToPoint(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { collectionPointId: string; driverLat: number; driverLng: number },
  ) {
    return this.routesService.deliverToPoint(id, body);
  }
}
