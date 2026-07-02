import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { DonorRequestStatus, BusinessEventType } from '@prisma/client';
import { WeightsService } from './weights.service';
import { PrismaService } from '../../database/prisma/prisma.service';
import { EventStoreService } from '../event-store/event-store.service';

const mockPrisma = {
  donorRequest: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  weightRecord: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockEventStore = {
  save: jest.fn(),
};

const mockCommandBus = {
  execute: jest.fn(),
};

const mockTransitionTo = jest.fn();

jest.mock('../donor-requests/domain/value-objects/donor-request-status.vo', () => ({
  DonorRequestStatusVO: jest.fn().mockImplementation((status: string) => ({
    current: status,
    transitionTo: mockTransitionTo,
  })),
}));

describe('WeightsService', () => {
  let service: WeightsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeightsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventStoreService, useValue: mockEventStore },
        { provide: CommandBus, useValue: mockCommandBus },
      ],
    }).compile();

    service = module.get<WeightsService>(WeightsService);
    jest.clearAllMocks();
    mockTransitionTo.mockReturnValue({ current: 'WEIGHED' });
  });

  const weightData = {
    donorRequestId: 'req-1',
    grossWeightKg: 150,
    netWeightKg: 140,
    tareKg: 10,
    notes: 'Peso verificado',
    confirmedByUserId: 'user-1',
  };

  describe('registerWeight', () => {
    it('should register weight and set status to WEIGHED for pickup flow', async () => {
      mockPrisma.donorRequest.findFirst.mockResolvedValue({
        id: 'req-1',
        status: 'APPROVED',
        route: { id: 'route-1' },
      });

      const createdWeight = { id: 'weight-1', ...weightData };
      mockTransitionTo.mockReturnValue({ current: 'WEIGHED' });
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        mockPrisma.weightRecord.create.mockResolvedValue(createdWeight);
        return fn(mockPrisma);
      });
      mockEventStore.save.mockResolvedValue(undefined);
      mockCommandBus.execute.mockResolvedValue(undefined);

      const result = await service.registerWeight(weightData);

      expect(result).toEqual(createdWeight);
      expect(mockPrisma.donorRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'WEIGHED' } }),
      );
      expect(mockEventStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'DonorRequest',
          type: BusinessEventType.WEIGHT_REGISTERED,
        }),
      );
      expect(mockCommandBus.execute).toHaveBeenCalled(); // auto-declaration triggered
    });

    it('should set status to FINISHED for dropoff flow (no route)', async () => {
      mockPrisma.donorRequest.findFirst.mockResolvedValue({
        id: 'req-1',
        status: 'APPROVED',
        route: null,
      });

      mockTransitionTo.mockReturnValue({ current: 'FINISHED' });
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        mockPrisma.weightRecord.create.mockResolvedValue({ id: 'weight-1' });
        return fn(mockPrisma);
      });
      mockEventStore.save.mockResolvedValue(undefined);

      await service.registerWeight({
        donorRequestId: 'req-1',
        grossWeightKg: 50,
        netWeightKg: 45,
        confirmedByUserId: 'user-1',
      });

      expect(mockPrisma.donorRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'FINISHED' } }),
      );
      expect(mockCommandBus.execute).not.toHaveBeenCalled(); // no auto-declaration for dropoff
    });

    it('should throw NotFoundException if request does not exist', async () => {
      mockPrisma.donorRequest.findFirst.mockResolvedValue(null);

      await expect(service.registerWeight(weightData)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should not break if auto-declaration fails (best-effort)', async () => {
      mockPrisma.donorRequest.findFirst.mockResolvedValue({
        id: 'req-1',
        status: 'APPROVED',
        route: { id: 'route-1' },
      });

      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        mockPrisma.weightRecord.create.mockResolvedValue({ id: 'weight-1' });
        return fn(mockPrisma);
      });
      mockEventStore.save.mockResolvedValue(undefined);
      mockCommandBus.execute.mockRejectedValue(new Error('PDF generation failed'));

      const result = await service.registerWeight(weightData);

      expect(result).toBeDefined();
      expect(mockCommandBus.execute).toHaveBeenCalled();
    });

    it('should create weight record with all optional fields', async () => {
      mockPrisma.donorRequest.findFirst.mockResolvedValue({
        id: 'req-1',
        status: 'PENDING',
        route: null,
      });

      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        mockPrisma.weightRecord.create.mockResolvedValue({ id: 'weight-1' });
        return fn(mockPrisma);
      });
      mockEventStore.save.mockResolvedValue(undefined);

      await service.registerWeight({
        donorRequestId: 'req-1',
        routeId: 'route-1',
        collectionPointId: 'cp-1',
        grossWeightKg: 200,
        netWeightKg: 190,
        tareKg: 10,
        notes: 'Peso confirmado',
        confirmedByUserId: 'user-1',
      });

      expect(mockPrisma.weightRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            routeId: 'route-1',
            collectionPointId: 'cp-1',
            tareKg: 10,
            notes: 'Peso confirmado',
          }),
        }),
      );
    });
  });
});
