import { Test, TestingModule } from '@nestjs/testing';
import { DonorRequestStatus } from '@prisma/client';
import { DirectToCollectionPointHandler } from './direct-to-point.handler';
import { DirectToCollectionPointCommand } from '../commands/direct-to-point.command';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { EventStoreService } from '../../../event-store/event-store.service';

const mockPrisma = {
  $transaction: jest.fn(),
  donorRequest: { findUnique: jest.fn(), update: jest.fn() },
  collectionPoint: { findUnique: jest.fn() },
  pickupDecision: { create: jest.fn() },
};

const mockEventStore = { save: jest.fn() };

describe('DirectToCollectionPointHandler', () => {
  let handler: DirectToCollectionPointHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DirectToCollectionPointHandler,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventStoreService, useValue: mockEventStore },
      ],
    }).compile();

    handler = module.get<DirectToCollectionPointHandler>(DirectToCollectionPointHandler);
    jest.clearAllMocks();
  });

  it('should direct request to collection point successfully', async () => {
    mockPrisma.donorRequest.findUnique.mockResolvedValue({
      id: 'req-id', status: DonorRequestStatus.UNDER_REVIEW,
    });
    mockPrisma.collectionPoint.findUnique.mockResolvedValue({
      id: 'point-id',
    });
    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      mockPrisma.donorRequest.update.mockResolvedValue({
        id: 'req-id', status: DonorRequestStatus.DIRECTED_TO_COLLECTION_POINT,
      });
      mockPrisma.pickupDecision.create.mockResolvedValue({});
      return fn(mockPrisma);
    });
    mockEventStore.save.mockResolvedValue(undefined);

    const command = new DirectToCollectionPointCommand(
      'req-id', 'point-id', 'op-id', 'Levar na segunda-feira',
    );
    const result = await handler.execute(command);

    expect(result.status).toBe(DonorRequestStatus.DIRECTED_TO_COLLECTION_POINT);
    expect(mockPrisma.pickupDecision.create).toHaveBeenCalled();
  });
});
