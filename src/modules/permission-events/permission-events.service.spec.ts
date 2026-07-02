import { Test, TestingModule } from '@nestjs/testing';
import { PermissionEventsService } from './permission-events.service';
import { PrismaService } from '../../database/prisma/prisma.service';
import { TrackingGateway } from '../tracking/presentation/gateways/tracking.gateway';

const mockPrisma = {
  driverPermissionEvent: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
};

const mockTrackingGateway = {
  emitAdminNotification: jest.fn(),
};

describe('PermissionEventsService', () => {
  let service: PermissionEventsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionEventsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TrackingGateway, useValue: mockTrackingGateway },
      ],
    }).compile();

    service = module.get<PermissionEventsService>(PermissionEventsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates the event and emits an info notification when GRANTED', async () => {
      mockPrisma.driverPermissionEvent.create.mockResolvedValue({ id: 'e1' });
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'João' });

      const result = await service.create('user-1', {
        permissionType: 'LOCATION_FOREGROUND',
        status: 'GRANTED',
        platform: 'android',
      } as any);

      expect(result).toEqual({ id: 'e1' });
      expect(mockTrackingGateway.emitAdminNotification).toHaveBeenCalledWith(
        expect.stringContaining('João'),
        'info',
      );
    });

    it('emits a warning notification when DENIED', async () => {
      mockPrisma.driverPermissionEvent.create.mockResolvedValue({ id: 'e1' });
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Maria' });

      await service.create('user-1', {
        permissionType: 'LOCATION_BACKGROUND',
        status: 'DENIED',
        platform: 'android',
      } as any);

      expect(mockTrackingGateway.emitAdminNotification).toHaveBeenCalledWith(
        expect.stringContaining('negou'),
        'warning',
      );
    });

    it('emits an error notification when REVOKED', async () => {
      mockPrisma.driverPermissionEvent.create.mockResolvedValue({ id: 'e1' });
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Pedro' });

      await service.create('user-1', {
        permissionType: 'LOCATION_BACKGROUND',
        status: 'REVOKED',
        platform: 'android',
      } as any);

      expect(mockTrackingGateway.emitAdminNotification).toHaveBeenCalledWith(
        expect.stringContaining('revogou'),
        'error',
      );
    });

    it('falls back to "Motorista" when user is not found', async () => {
      mockPrisma.driverPermissionEvent.create.mockResolvedValue({ id: 'e1' });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await service.create('user-1', {
        permissionType: 'LOCATION_FOREGROUND',
        status: 'GRANTED',
        platform: 'android',
      } as any);

      expect(mockTrackingGateway.emitAdminNotification).toHaveBeenCalledWith(
        expect.stringContaining('Motorista'),
        'info',
      );
    });
  });

  describe('findAll', () => {
    it('applies filters and returns paginated results', async () => {
      mockPrisma.driverPermissionEvent.findMany.mockResolvedValue([{ id: 'e1' }]);
      mockPrisma.driverPermissionEvent.count.mockResolvedValue(1);

      const result = await service.findAll({ userId: 'user-1', page: 2, limit: 10 });

      expect(mockPrisma.driverPermissionEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' }, skip: 10, take: 10 }),
      );
      expect(result).toEqual({ data: [{ id: 'e1' }], total: 1, page: 2, limit: 10 });
    });

    it('defaults to page 1 and limit 20 when not provided', async () => {
      mockPrisma.driverPermissionEvent.findMany.mockResolvedValue([]);
      mockPrisma.driverPermissionEvent.count.mockResolvedValue(0);

      const result = await service.findAll({});

      expect(mockPrisma.driverPermissionEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });
});
