import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RouteStatus, DonorRequestStatus } from '@prisma/client';
import { RoutesService } from './routes.service';
import { PrismaService } from '../../database/prisma/prisma.service';
import { EventStoreService } from '../event-store/event-store.service';
import { TrackingRedisService } from '../tracking/infrastructure/redis/tracking-redis.service';
import { TrackingGateway } from '../tracking/presentation/gateways/tracking.gateway';
import { MapboxDirectionsService } from '../tracking/infrastructure/mapbox-directions.service';
import {
  DriverNotAssignedError,
  InvalidStatusTransitionError,
} from '../../common/errors/domain.errors';

const mockPrisma = {
  route: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  donorRequest: {
    update: jest.fn(),
    findUnique: jest.fn(),
  },
  driver: {
    findUnique: jest.fn(),
  },
  routeStop: {
    findFirst: jest.fn(),
  },
  collectionPoint: {
    findFirst: jest.fn(),
  },
  trackingSession: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockEventStore = { save: jest.fn() };
const mockTrackingRedis = {
  saveDriverLocation: jest.fn(),
  saveRouteLiveLocation: jest.fn(),
  getPolylineOrigin: jest.fn(),
  savePolylineOrigin: jest.fn(),
  createTrackingSession: jest.fn(),
};
const mockTrackingGateway = {
  emitRouteStatusChanged: jest.fn(),
  emitAdminNotification: jest.fn(),
  emitToTrackingToken: jest.fn(),
  emitRoutePolyline: jest.fn(),
  server: { to: jest.fn(() => ({ emit: jest.fn() })) },
};
const mockMapboxDirections = { getRoute: jest.fn() };
const mockConfig = { get: jest.fn((_key: string, defaultValue?: unknown) => defaultValue) };

const mockTransitionTo = jest.fn();

jest.mock('../donor-requests/domain/value-objects/donor-request-status.vo', () => ({
  DonorRequestStatusVO: jest.fn().mockImplementation((status: string) => ({
    current: status,
    transitionTo: mockTransitionTo,
  })),
}));

describe('RoutesService', () => {
  let service: RoutesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventStoreService, useValue: mockEventStore },
        { provide: TrackingRedisService, useValue: mockTrackingRedis },
        { provide: TrackingGateway, useValue: mockTrackingGateway },
        { provide: MapboxDirectionsService, useValue: mockMapboxDirections },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<RoutesService>(RoutesService);
    jest.clearAllMocks();
    mockTransitionTo.mockReturnValue({ current: 'GOING_TO_COLLECTION_POINT' });
  });

  describe('confirmCollection', () => {
    it('throws if route is not ARRIVED_AT_DONOR', async () => {
      mockPrisma.route.findUnique.mockResolvedValue({
        id: 'r1',
        driverId: 'd1',
        status: RouteStatus.IN_PROGRESS,
      });

      await expect(service.confirmCollection('r1', 'd1')).rejects.toThrow(
        InvalidStatusTransitionError,
      );
      expect(mockPrisma.route.update).not.toHaveBeenCalled();
    });

    it('transitions to COLLECTED when status is ARRIVED_AT_DONOR', async () => {
      mockPrisma.route.findUnique.mockResolvedValue({
        id: 'r1',
        driverId: 'd1',
        donorRequestId: 'dr1',
        status: RouteStatus.ARRIVED_AT_DONOR,
      });
      mockPrisma.route.update.mockResolvedValue({ id: 'r1', status: RouteStatus.COLLECTED });

      const result = await service.confirmCollection('r1', 'd1');

      expect(result.status).toBe(RouteStatus.COLLECTED);
      expect(mockPrisma.donorRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: DonorRequestStatus.COLLECTED } }),
      );
      expect(mockTrackingGateway.emitRouteStatusChanged).toHaveBeenCalledWith(
        'r1',
        RouteStatus.COLLECTED,
      );
    });

    it('throws DriverNotAssignedError if driver mismatches', async () => {
      mockPrisma.route.findUnique.mockResolvedValue({
        id: 'r1',
        driverId: 'other-driver',
        status: RouteStatus.ARRIVED_AT_DONOR,
      });

      await expect(service.confirmCollection('r1', 'd1')).rejects.toThrow(DriverNotAssignedError);
    });
  });

  describe('goingToCollectionPoint', () => {
    it('throws if route is not COLLECTED', async () => {
      mockPrisma.route.findUnique.mockResolvedValue({
        id: 'r1',
        driverId: 'd1',
        status: RouteStatus.ARRIVED_AT_DONOR,
      });

      await expect(service.goingToCollectionPoint('r1', 'd1')).rejects.toThrow(
        InvalidStatusTransitionError,
      );
    });

    it('transitions Route and DonorRequest when status is COLLECTED', async () => {
      mockPrisma.route.findUnique.mockResolvedValue({
        id: 'r1',
        driverId: 'd1',
        donorRequestId: 'dr1',
        status: RouteStatus.COLLECTED,
      });
      mockPrisma.route.update.mockResolvedValue({
        id: 'r1',
        status: RouteStatus.GOING_TO_COLLECTION_POINT,
      });
      mockTransitionTo.mockReturnValue({ current: DonorRequestStatus.GOING_TO_COLLECTION_POINT });

      await service.goingToCollectionPoint('r1', 'd1');

      expect(mockPrisma.donorRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: DonorRequestStatus.GOING_TO_COLLECTION_POINT },
        }),
      );
      expect(mockTrackingGateway.emitRouteStatusChanged).toHaveBeenCalledWith(
        'r1',
        RouteStatus.GOING_TO_COLLECTION_POINT,
      );
    });
  });

  describe('arriveAtCollectionPoint', () => {
    it('throws if route is not GOING_TO_COLLECTION_POINT', async () => {
      mockPrisma.route.findUnique.mockResolvedValue({
        id: 'r1',
        driverId: 'd1',
        status: RouteStatus.COLLECTED,
      });

      await expect(service.arriveAtCollectionPoint('r1', 'd1')).rejects.toThrow(
        InvalidStatusTransitionError,
      );
    });

    it('transitions Route only (no DonorRequest change)', async () => {
      mockPrisma.route.findUnique.mockResolvedValue({
        id: 'r1',
        driverId: 'd1',
        status: RouteStatus.GOING_TO_COLLECTION_POINT,
      });
      mockPrisma.route.update.mockResolvedValue({
        id: 'r1',
        status: RouteStatus.ARRIVED_AT_COLLECTION_POINT,
      });

      await service.arriveAtCollectionPoint('r1', 'd1');

      expect(mockPrisma.donorRequest.update).not.toHaveBeenCalled();
      expect(mockTrackingGateway.emitRouteStatusChanged).toHaveBeenCalledWith(
        'r1',
        RouteStatus.ARRIVED_AT_COLLECTION_POINT,
      );
    });
  });

  describe('deliverToPoint', () => {
    const deliverData = { collectionPointId: 'cp1', driverLat: -3.7319, driverLng: -38.5267 };

    it('throws if route is not ARRIVED_AT_COLLECTION_POINT', async () => {
      mockPrisma.route.findUnique.mockResolvedValue({
        id: 'r1',
        driverId: 'd1',
        status: RouteStatus.GOING_TO_COLLECTION_POINT,
      });
      mockPrisma.collectionPoint.findFirst.mockResolvedValue({ lat: -3.73, lng: -38.52 });

      await expect(service.deliverToPoint('r1', 'd1', deliverData)).rejects.toThrow(
        InvalidStatusTransitionError,
      );
    });

    it('transitions to DELIVERED and updates DonorRequest when within geofence', async () => {
      mockPrisma.route.findUnique.mockResolvedValue({
        id: 'r1',
        driverId: 'd1',
        donorRequestId: 'dr1',
        status: RouteStatus.ARRIVED_AT_COLLECTION_POINT,
        trackingToken: null,
      });
      mockPrisma.collectionPoint.findFirst.mockResolvedValue({
        id: 'cp1',
        lat: -3.7319,
        lng: -38.5267,
      });
      mockPrisma.route.update.mockResolvedValue({ id: 'r1', status: RouteStatus.DELIVERED });
      mockTransitionTo.mockReturnValue({ current: DonorRequestStatus.DELIVERED_TO_COLLECTION_POINT });

      const result = await service.deliverToPoint('r1', 'd1', deliverData);

      expect(result.status).toBe(RouteStatus.DELIVERED);
      expect(mockPrisma.donorRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: DonorRequestStatus.DELIVERED_TO_COLLECTION_POINT },
        }),
      );
    });
  });

  describe('finishRoute', () => {
    it('throws if route is not DELIVERED', async () => {
      mockPrisma.route.findUnique.mockResolvedValue({
        id: 'r1',
        driverId: 'd1',
        status: RouteStatus.ARRIVED_AT_COLLECTION_POINT,
      });

      await expect(service.finishRoute('r1', 'd1')).rejects.toThrow(InvalidStatusTransitionError);
    });

    it('finishes the route without touching DonorRequest.status', async () => {
      mockPrisma.route.findUnique.mockResolvedValue({
        id: 'r1',
        driverId: 'd1',
        donorRequestId: 'dr1',
        status: RouteStatus.DELIVERED,
        trackingToken: null,
      });
      mockPrisma.route.update.mockResolvedValue({
        id: 'r1',
        status: RouteStatus.FINISHED,
        finishedAt: new Date(),
      });

      await service.finishRoute('r1', 'd1');

      expect(mockPrisma.donorRequest.update).not.toHaveBeenCalled();
      expect(mockTrackingGateway.emitRouteStatusChanged).toHaveBeenCalledWith(
        'r1',
        RouteStatus.FINISHED,
      );
    });
  });

  describe('startRoute', () => {
    it('throws if route is not ASSIGNED', async () => {
      mockPrisma.route.findUnique.mockResolvedValue({
        id: 'r1',
        driverId: 'd1',
        status: RouteStatus.PLANNED,
      });

      await expect(service.startRoute('r1', 'd1')).rejects.toThrow(InvalidStatusTransitionError);
    });

    it('starts the route and emits an admin notification', async () => {
      mockPrisma.route.findUnique.mockResolvedValue({
        id: 'r1',
        driverId: 'd1',
        donorRequestId: 'dr1',
        status: RouteStatus.ASSIGNED,
      });
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockPrisma));
      mockPrisma.driver.findUnique.mockResolvedValue({ id: 'd1', user: { name: 'João' } });
      mockPrisma.donorRequest.findUnique.mockResolvedValue({ id: 'dr1', donorName: 'Maria' });

      await service.startRoute('r1', 'd1');

      expect(mockTrackingGateway.emitAdminNotification).toHaveBeenCalledWith(
        expect.stringContaining('João'),
      );
      expect(mockTrackingGateway.emitRouteStatusChanged).toHaveBeenCalledWith(
        'r1',
        RouteStatus.IN_PROGRESS,
      );
    });
  });

  describe('sendLocation', () => {
    it('saves and broadcasts location without computing a polyline for FINISHED routes', async () => {
      mockPrisma.route.findUnique.mockResolvedValue({
        id: 'r1',
        driverId: 'd1',
        status: RouteStatus.FINISHED,
        trackingToken: null,
      });

      await service.sendLocation('r1', { lat: -3.73, lng: -38.52 });

      expect(mockTrackingRedis.saveDriverLocation).toHaveBeenCalled();
      expect(mockMapboxDirections.getRoute).not.toHaveBeenCalled();
    });

    it('computes and emits a polyline when moving toward the donor', async () => {
      mockPrisma.route.findUnique.mockResolvedValue({
        id: 'r1',
        driverId: 'd1',
        status: RouteStatus.IN_PROGRESS,
        trackingToken: null,
      });
      mockPrisma.routeStop.findFirst.mockResolvedValue({ lat: -3.75, lng: -38.55 });
      mockTrackingRedis.getPolylineOrigin.mockResolvedValue(null);
      mockMapboxDirections.getRoute.mockResolvedValue([{ lat: -3.73, lng: -38.52 }]);

      await service.sendLocation('r1', { lat: -3.73, lng: -38.52 });

      expect(mockMapboxDirections.getRoute).toHaveBeenCalledWith(
        -3.73,
        -38.52,
        -3.75,
        -38.55,
      );
      expect(mockTrackingGateway.emitRoutePolyline).toHaveBeenCalledWith(
        'r1',
        [{ lat: -3.73, lng: -38.52 }],
      );
    });

    it('skips polyline recalculation when driver has not moved far enough', async () => {
      mockPrisma.route.findUnique.mockResolvedValue({
        id: 'r1',
        driverId: 'd1',
        status: RouteStatus.IN_PROGRESS,
        trackingToken: null,
      });
      mockPrisma.routeStop.findFirst.mockResolvedValue({ lat: -3.75, lng: -38.55 });
      mockTrackingRedis.getPolylineOrigin.mockResolvedValue({ lat: -3.73, lng: -38.52 });

      await service.sendLocation('r1', { lat: -3.730001, lng: -38.520001 });

      expect(mockMapboxDirections.getRoute).not.toHaveBeenCalled();
    });
  });
});
