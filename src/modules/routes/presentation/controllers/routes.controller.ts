import { Controller, Get, Patch, Post, Param, Body, Request, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { RoutesService } from '../../routes.service';

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

  @Patch(':id/start')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Start route — generates tracking token' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Route started, tracking token returned' })
  startRoute(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.routesService.startRoute(id, req.user.id);
  }

  @Post(':id/location')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Send driver GPS location — saved to Redis, emitted via WebSocket' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  sendLocation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { lat: number; lng: number; accuracy?: number; speed?: number; heading?: number; battery?: number },
  ) {
    return this.routesService.sendLocation(id, body);
  }

  @Patch(':id/deliver-to-point')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Confirm delivery at collection point (validates geofence)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Delivery confirmed' })
  @ApiResponse({ status: 403, description: 'GEOFENCE_VIOLATION — driver outside allowed radius' })
  deliverToPoint(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { collectionPointId: string; driverLat: number; driverLng: number },
  ) {
    return this.routesService.deliverToPoint(id, body);
  }
}
