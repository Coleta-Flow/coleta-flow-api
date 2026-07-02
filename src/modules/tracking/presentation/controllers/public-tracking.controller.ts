import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../../../common/decorators/public.decorator';
import { TrackingRedisService } from '../../infrastructure/redis/tracking-redis.service';
import { PrismaService } from '../../../../database/prisma/prisma.service';

@ApiTags('Public Tracking')
@Controller('public/tracking')
export class PublicTrackingController {
  constructor(
    private readonly trackingRedis: TrackingRedisService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Get(':token')
  @ApiOperation({ summary: 'Get real-time tracking info by tracking token (public, no auth)' })
  @ApiParam({ name: 'token', type: 'string' })
  @ApiResponse({ status: 200, description: 'Tracking data' })
  @ApiResponse({ status: 404, description: 'Token expired or route finished' })
  async getTrackingByToken(@Param('token') token: string) {
    const session = await this.trackingRedis.getTrackingSession(token);

    if (!session) {
      throw new NotFoundException({
        code: 'TRACKING_TOKEN_EXPIRED',
        message: 'Token inválido ou expirado.',
      });
    }

    const route = await this.prisma.route.findUnique({
      where: { id: session.routeId },
      include: {
        donorRequest: {
          select: { donorName: true, address: true, city: true },
        },
        driver: {
          include: { user: { select: { name: true } } },
        },
        stops: { orderBy: { sequence: 'asc' } },
      },
    });

    if (!route) throw new NotFoundException('Rota não encontrada.');

    const lastLocation = route.driverId
      ? await this.trackingRedis.getDriverLocation(route.driverId)
      : null;

    return {
      routeId: route.id,
      status: route.status,
      trackingToken: token,
      expiresAt: session.expiresAt,
      driver: {
        name: route.driver?.user.name ?? null,
      },
      donorRequest: {
        donorName: route.donorRequest.donorName,
        address: route.donorRequest.address,
        city: route.donorRequest.city,
      },
      stops: route.stops.map((s) => ({
        sequence: s.sequence,
        type: s.type,
        address: s.address,
        lat: s.lat ? Number(s.lat) : null,
        lng: s.lng ? Number(s.lng) : null,
        arrivedAt: s.arrivedAt,
        completedAt: s.completedAt,
      })),
      lastLocation: lastLocation
        ? {
            lat: lastLocation.lat,
            lng: lastLocation.lng,
            speed: lastLocation.speed ?? null,
            heading: lastLocation.heading ?? null,
            updatedAt: lastLocation.timestamp,
          }
        : null,
    };
  }
}
