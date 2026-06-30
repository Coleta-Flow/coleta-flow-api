import { Injectable, NotFoundException } from '@nestjs/common';
import { RouteStatus, BusinessEventType, DonorRequestStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma/prisma.service';
import { EventStoreService } from '../event-store/event-store.service';
import { TrackingRedisService } from '../tracking/infrastructure/redis/tracking-redis.service';
import { TrackingGateway } from '../tracking/presentation/gateways/tracking.gateway';
import { haversineDistance } from '../../common/utils/geo.utils';
import { GeofenceViolationError, DriverNotAssignedError } from '../../common/errors/domain.errors';

@Injectable()
export class RoutesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventStore: EventStoreService,
    private readonly trackingRedis: TrackingRedisService,
    private readonly trackingGateway: TrackingGateway,
    private readonly config: ConfigService,
  ) {}

  async createRoute(
    donorRequestId: string,
    driverId?: string,
  ) {
    const donorRequest = await this.prisma.donorRequest.findFirst({
      where: { id: donorRequestId },
    });
    if (!donorRequest) throw new NotFoundException('Solicitação não encontrada.');

    const route = await this.prisma.route.create({
      data: {
        donorRequestId,
        driverId: driverId ?? null,
        status: driverId ? RouteStatus.ASSIGNED : RouteStatus.PLANNED,
      },
      include: { donorRequest: true, driver: { include: { user: true } } },
    });

    if (driverId) {
      await this.prisma.donorRequest.update({
        where: { id: donorRequestId },
        data: { status: DonorRequestStatus.DRIVER_ASSIGNED },
      });
    }

    await this.eventStore.save({
      entityType: 'Route',
      entityId: route.id,
      type: BusinessEventType.DRIVER_ASSIGNED_TO_ROUTE,
      payload: { donorRequestId, driverId: driverId ?? null },
    });

    return route;
  }

  async getRouteById(routeId: string) {
    const route = await this.prisma.route.findUnique({
      where: { id: routeId },
      include: {
        donorRequest: { include: { materialType: true } },
        driver: { include: { user: true } },
        stops: { include: { collectionPoint: true } },
        trackingSession: true,
      },
    });
    if (!route) throw new NotFoundException('Rota não encontrada.');
    return route;
  }

  async assignDriver(routeId: string, driverId: string) {
    const route = await this.getRouteOrThrow(routeId);

    const updated = await this.prisma.route.update({
      where: { id: routeId },
      data: { driverId, status: RouteStatus.ASSIGNED },
      include: { driver: { include: { user: true } } },
    });

    await this.prisma.donorRequest.update({
      where: { id: route.donorRequestId },
      data: { status: DonorRequestStatus.DRIVER_ASSIGNED },
    });

    await this.eventStore.save({
      entityType: 'Route',
      entityId: routeId,
      type: BusinessEventType.DRIVER_ASSIGNED_TO_ROUTE,
      payload: { driverId },
    });

    this.trackingGateway.emitRouteStatusChanged(routeId, RouteStatus.ASSIGNED);

    return updated;
  }

  async confirmArrivalAtDonor(routeId: string, driverId: string) {
    const route = await this.getRouteOrThrow(routeId);

    if (!route.driverId) throw new DriverNotAssignedError();
    if (route.driverId !== driverId) throw new DriverNotAssignedError();

    const updated = await this.prisma.route.update({
      where: { id: routeId },
      data: { status: RouteStatus.ARRIVED_AT_DONOR },
    });

    await this.prisma.donorRequest.update({
      where: { id: route.donorRequestId },
      data: { status: DonorRequestStatus.DRIVER_ARRIVED },
    });

    await this.eventStore.save({
      entityType: 'Route',
      entityId: routeId,
      type: BusinessEventType.DRIVER_ARRIVED_AT_DONOR,
      payload: { driverId },
    });

    this.trackingGateway.emitRouteStatusChanged(routeId, RouteStatus.ARRIVED_AT_DONOR);

    return updated;
  }

  async confirmCollection(routeId: string, driverId: string) {
    const route = await this.getRouteOrThrow(routeId);

    if (!route.driverId) throw new DriverNotAssignedError();
    if (route.driverId !== driverId) throw new DriverNotAssignedError();

    const updated = await this.prisma.route.update({
      where: { id: routeId },
      data: { status: RouteStatus.COLLECTED },
    });

    await this.prisma.donorRequest.update({
      where: { id: route.donorRequestId },
      data: { status: DonorRequestStatus.COLLECTED },
    });

    await this.eventStore.save({
      entityType: 'Route',
      entityId: routeId,
      type: BusinessEventType.MATERIAL_COLLECTED,
      payload: { driverId },
    });

    this.trackingGateway.emitRouteStatusChanged(routeId, RouteStatus.COLLECTED);

    if (route.trackingToken) {
      this.trackingGateway.emitToTrackingToken(route.trackingToken, 'driver:collected', {
        routeId,
        timestamp: new Date().toISOString(),
      });
    }

    return updated;
  }

  async finishRoute(routeId: string, driverId: string) {
    const route = await this.getRouteOrThrow(routeId);

    if (!route.driverId) throw new DriverNotAssignedError();
    if (route.driverId !== driverId) throw new DriverNotAssignedError();

    const updated = await this.prisma.route.update({
      where: { id: routeId },
      data: { status: RouteStatus.FINISHED, finishedAt: new Date() },
    });

    await this.prisma.donorRequest.update({
      where: { id: route.donorRequestId },
      data: { status: DonorRequestStatus.DELIVERED_TO_COLLECTION_POINT },
    });

    await this.eventStore.save({
      entityType: 'Route',
      entityId: routeId,
      type: BusinessEventType.ROUTE_FINISHED,
      payload: { driverId, finishedAt: updated.finishedAt },
    });

    this.trackingGateway.emitRouteStatusChanged(routeId, RouteStatus.FINISHED);

    if (route.trackingToken) {
      this.trackingGateway.emitToTrackingToken(route.trackingToken, 'driver:finished', {
        routeId,
        timestamp: new Date().toISOString(),
      });
      await this.trackingRedis.invalidateTrackingSession(route.trackingToken);
    }

    return updated;
  }

  async sendLocation(
    routeId: string,
    payload: {
      lat: number;
      lng: number;
      accuracy?: number;
      speed?: number;
      heading?: number;
      battery?: number;
    },
  ) {
    const route = await this.getRouteOrThrow(routeId);

    const locationData = {
      routeId,
      driverId: route.driverId ?? '',
      lat: payload.lat,
      lng: payload.lng,
      accuracy: payload.accuracy,
      speed: payload.speed,
      heading: payload.heading,
      battery: payload.battery,
      timestamp: new Date().toISOString(),
    };

    await this.trackingRedis.saveDriverLocation(locationData);
    await this.trackingRedis.saveRouteLiveLocation(routeId, locationData);

    const updatedAt = new Date().toISOString();
    const routeRoom = `route:${routeId}`;
    this.trackingGateway['server']?.to(routeRoom).emit('tracking:update', {
      ...locationData,
      updatedAt,
    });

    if (route.trackingToken) {
      this.trackingGateway.emitToTrackingToken(route.trackingToken, 'tracking:update', {
        ...locationData,
        updatedAt,
      });
    }

    return { ok: true };
  }

  async cancelRoute(routeId: string, reason?: string) {
    const route = await this.getRouteOrThrow(routeId);

    const updated = await this.prisma.route.update({
      where: { id: routeId },
      data: { status: RouteStatus.CANCELLED, cancelReason: reason ?? null, cancelledAt: new Date() },
    });

    await this.prisma.donorRequest.update({
      where: { id: route.donorRequestId },
      data: { status: DonorRequestStatus.CANCELLED },
    });

    await this.eventStore.save({
      entityType: 'Route',
      entityId: routeId,
      type: BusinessEventType.REQUEST_CANCELLED,
      payload: { reason: reason ?? null },
    });

    this.trackingGateway.emitRouteStatusChanged(routeId, RouteStatus.CANCELLED);

    if (route.trackingToken) {
      await this.trackingRedis.invalidateTrackingSession(route.trackingToken);
    }

    return updated;
  }

  findAll(driverId?: string) {
    return this.prisma.route.findMany({
      where: { ...(driverId ? { driverId } : {}) },
      include: {
        donorRequest: true,
        driver: { include: { user: true } },
        stops: { orderBy: { sequence: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async startRoute(routeId: string, driverId: string) {
    const route = await this.getRouteOrThrow(routeId);

    if (!route.driverId) throw new DriverNotAssignedError();
    if (route.driverId !== driverId) throw new DriverNotAssignedError();

    const token = uuidv4();
    const ttlMinutes = this.config.get<number>('TRACKING_TOKEN_EXPIRES_IN_MINUTES', 180);

    await this.prisma.$transaction(async (tx) => {
      await tx.route.update({
        where: { id: routeId },
        data: { status: RouteStatus.IN_PROGRESS, startedAt: new Date(), trackingToken: token },
      });
      await tx.trackingSession.create({
        data: {
          routeId,
          token,
          expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
        },
      });
    });

    await this.trackingRedis.createTrackingSession(token, routeId, ttlMinutes);

    await this.eventStore.save({
      entityType: 'Route',
      entityId: routeId,
      type: BusinessEventType.ROUTE_STARTED,
      payload: { driverId, trackingToken: token },
    });

    this.trackingGateway.emitRouteStatusChanged(routeId, RouteStatus.IN_PROGRESS);

    return { routeId, trackingToken: token, trackingUrl: `${this.config.get('APP_URL')}/acompanhar/${token}` };
  }

  async deliverToPoint(routeId: string, data: {
    collectionPointId: string;
    driverLat: number;
    driverLng: number;
  }) {
    const [route, point] = await Promise.all([
      this.getRouteOrThrow(routeId),
      this.prisma.collectionPoint.findFirst({ where: { id: data.collectionPointId } }),
    ]);

    if (!point) throw new NotFoundException('Ponto de coleta não encontrado.');

    const geofenceRadius = this.config.get<number>('GEOFENCE_RADIUS_METERS', 100);
    const distance = haversineDistance(
      data.driverLat, data.driverLng,
      Number(point.lat), Number(point.lng),
    );

    if (distance > geofenceRadius) {
      throw new GeofenceViolationError(distance, geofenceRadius);
    }

    const updated = await this.prisma.route.update({
      where: { id: routeId },
      data: { status: RouteStatus.DELIVERED },
    });

    await this.eventStore.save({
      entityType: 'Route',
      entityId: routeId,
      type: BusinessEventType.MATERIAL_DELIVERED_TO_COLLECTION_POINT,
      payload: { collectionPointId: data.collectionPointId, distanceMeters: Math.round(distance) },
    });

    this.trackingGateway.emitRouteStatusChanged(routeId, RouteStatus.DELIVERED);

    if (route.trackingToken) {
      this.trackingGateway.emitToTrackingToken(route.trackingToken, 'driver:delivered', {
        routeId, timestamp: new Date().toISOString(),
      });
      await this.trackingRedis.invalidateTrackingSession(route.trackingToken);
    }

    return updated;
  }

  private async getRouteOrThrow(routeId: string) {
    const route = await this.prisma.route.findUnique({ where: { id: routeId } });
    if (!route) throw new NotFoundException('Rota não encontrada.');
    return route;
  }
}
