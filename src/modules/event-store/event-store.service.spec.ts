import { Test, TestingModule } from '@nestjs/testing';
import { BusinessEventType } from '@prisma/client';
import { EventStoreService } from './event-store.service';
import { PrismaService } from '../../database/prisma/prisma.service';

const mockPrisma = {
  businessEvent: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

describe('EventStoreService', () => {
  let service: EventStoreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventStoreService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<EventStoreService>(EventStoreService);
    jest.clearAllMocks();
  });

  describe('save', () => {
    it('creates a business event with the provided data', async () => {
      mockPrisma.businessEvent.create.mockResolvedValue({ id: 'e1' });

      await service.save({
        entityType: 'DonorRequest',
        entityId: 'dr1',
        type: BusinessEventType.WEIGHT_REGISTERED,
        payload: { foo: 'bar' },
      });

      expect(mockPrisma.businessEvent.create).toHaveBeenCalledWith({
        data: {
          entityType: 'DonorRequest',
          entityId: 'dr1',
          type: BusinessEventType.WEIGHT_REGISTERED,
          payload: { foo: 'bar' },
        },
      });
    });

    it('does not return a value', async () => {
      mockPrisma.businessEvent.create.mockResolvedValue({ id: 'e1' });

      const result = await service.save({
        entityType: 'Route',
        entityId: 'r1',
        type: BusinessEventType.WEIGHT_REGISTERED,
        payload: {},
      });

      expect(result).toBeUndefined();
    });
  });

  describe('findByEntity', () => {
    it('queries events for the given entity ordered by occurredAt asc', async () => {
      const events = [{ id: 'e1' }, { id: 'e2' }];
      mockPrisma.businessEvent.findMany.mockResolvedValue(events);

      const result = await service.findByEntity('DonorRequest', 'dr1');

      expect(mockPrisma.businessEvent.findMany).toHaveBeenCalledWith({
        where: { entityType: 'DonorRequest', entityId: 'dr1' },
        orderBy: { occurredAt: 'asc' },
      });
      expect(result).toEqual(events);
    });
  });
});
