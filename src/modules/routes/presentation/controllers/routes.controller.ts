import { Controller, Get, Post, Patch, Param, Body, Request, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { RoutesService } from '../../routes.service';
import {
  AcceptDemandDto,
  CancelRouteDto,
  SendLocationDto,
  DeliverToPointDto,
} from '../../dto/route.dto';

@ApiTags('Routes')
@ApiBearerAuth()
@Controller('routes')
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Get()
  @Roles(UserRole.OPERATOR, UserRole.ADMIN, UserRole.DRIVER)
  @ApiOperation({ summary: 'List routes (DRIVER sees only assigned routes)' })
  @ApiResponse({ status: 200, description: 'List of routes' })
  findAll(@Request() req: any) {
    const driverId =
      req.user.role === UserRole.DRIVER ? (req.user.driverId as string | null) : undefined;
    if (req.user.role === UserRole.DRIVER && !driverId) return [];
    return this.routesService.findAll(driverId ?? undefined);
  }

  @Get('available-demands')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'List approved pickup demands and unassigned planned routes for the driver app' })
  @ApiQuery({ name: 'city', required: false })
  listAvailableDemands(@Query('city') city?: string) {
    return this.routesService.listAvailableDemands(city);
  }

  @Post('accept-demand')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Driver accepts an approved demand and creates an assigned route' })
  @ApiResponse({ status: 201, description: 'Route created and assigned to the authenticated driver' })
  acceptDemand(@Body() dto: AcceptDemandDto, @Request() req: any) {
    return this.routesService.acceptDemand(req.user.driverId, dto.donorRequestId, dto.collectionPointId);
  }

  @Get(':id')
  @Roles(UserRole.OPERATOR, UserRole.ADMIN, UserRole.DRIVER)
  @ApiOperation({ summary: 'Get route details with stops, driver and tracking session' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Route details' })
  @ApiResponse({ status: 404, description: 'Route not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.routesService.getRouteById(id);
  }

  @Patch(':id/accept')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Driver accepts an existing planned route without a driver' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Route assigned to driver' })
  acceptRoute(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.routesService.acceptRoute(id, req.user.driverId);
  }

  @Patch(':id/start')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Start route — generates tracking token' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Route started, tracking token returned' })
  @ApiResponse({ status: 409, description: 'Route is not in ASSIGNED status' })
  startRoute(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.routesService.startRoute(id, req.user.driverId);
  }

  @Patch(':id/arrive-at-donor')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Driver confirms arrival at donor location' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Route status updated to ARRIVED_AT_DONOR' })
  arriveAtDonor(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.routesService.confirmArrivalAtDonor(id, req.user.driverId);
  }

  @Patch(':id/collect')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Driver confirms material collection at donor' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Route status updated to COLLECTED' })
  @ApiResponse({ status: 409, description: 'Route is not in ARRIVED_AT_DONOR status' })
  collect(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.routesService.confirmCollection(id, req.user.driverId);
  }

  @Patch(':id/going-to-collection-point')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Driver confirms departure to the collection point' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Route status updated to GOING_TO_COLLECTION_POINT' })
  @ApiResponse({ status: 409, description: 'Route is not in COLLECTED status' })
  goingToCollectionPoint(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.routesService.goingToCollectionPoint(id, req.user.driverId);
  }

  @Patch(':id/arrive-at-collection-point')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Driver confirms arrival at the collection point' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Route status updated to ARRIVED_AT_COLLECTION_POINT' })
  @ApiResponse({ status: 409, description: 'Route is not in GOING_TO_COLLECTION_POINT status' })
  arriveAtCollectionPoint(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.routesService.arriveAtCollectionPoint(id, req.user.driverId);
  }

  @Patch(':id/finish')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Finish route after delivery to collection point' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Route status updated to FINISHED' })
  @ApiResponse({ status: 409, description: 'Route is not in DELIVERED status' })
  finish(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.routesService.finishRoute(id, req.user.driverId);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Cancel a route (PLANNED, ASSIGNED or IN_PROGRESS)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Route cancelled' })
  cancel(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CancelRouteDto) {
    return this.routesService.cancelRoute(id, dto.reason);
  }

  @Post(':id/location')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Send driver GPS location — saved to Redis, emitted via WebSocket' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Location saved and broadcast' })
  sendLocation(@Param('id', ParseUUIDPipe) id: string, @Body() body: SendLocationDto) {
    return this.routesService.sendLocation(id, body);
  }

  @Patch(':id/deliver-to-point')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Confirm delivery at collection point (validates geofence)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Route status updated to DELIVERED' })
  @ApiResponse({ status: 403, description: 'GEOFENCE_VIOLATION — driver outside allowed radius' })
  @ApiResponse({ status: 409, description: 'Route is not in ARRIVED_AT_COLLECTION_POINT status' })
  deliverToPoint(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: DeliverToPointDto,
    @Request() req: any,
  ) {
    return this.routesService.deliverToPoint(id, req.user.driverId, body);
  }
}
