import { Test, TestingModule } from '@nestjs/testing';
import { CollectionPointsService } from './collection-points.service';
import { PrismaService } from '../../database/prisma/prisma.service';

const mockPrisma = {
  collectionPoint: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
};

describe('CollectionPointsService', () => {
  let service: CollectionPointsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CollectionPointsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<CollectionPointsService>(CollectionPointsService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns active, non-deleted collection points ordered by name', async () => {
      const points = [{ id: 'cp1', name: 'Ponto A' }];
      mockPrisma.collectionPoint.findMany.mockResolvedValue(points);

      const result = await service.findAll();

      expect(mockPrisma.collectionPoint.findMany).toHaveBeenCalledWith({
        where: { active: true, deletedAt: null },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(points);
    });

    it('filters by city when provided', async () => {
      mockPrisma.collectionPoint.findMany.mockResolvedValue([]);

      await service.findAll('Fortaleza');

      expect(mockPrisma.collectionPoint.findMany).toHaveBeenCalledWith({
        where: { active: true, deletedAt: null, city: 'Fortaleza' },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('findById', () => {
    it('returns the collection point matching the id', async () => {
      const point = { id: 'cp1', name: 'Ponto A' };
      mockPrisma.collectionPoint.findFirst.mockResolvedValue(point);

      const result = await service.findById('cp1');

      expect(mockPrisma.collectionPoint.findFirst).toHaveBeenCalledWith({ where: { id: 'cp1' } });
      expect(result).toEqual(point);
    });

    it('returns null when no collection point matches', async () => {
      mockPrisma.collectionPoint.findFirst.mockResolvedValue(null);

      const result = await service.findById('missing');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('creates a collection point with the provided data', async () => {
      const data = {
        name: 'Ponto B',
        address: 'Rua X, 100',
        city: 'Fortaleza',
        lat: -3.73,
        lng: -38.52,
      };
      const created = { id: 'cp2', ...data };
      mockPrisma.collectionPoint.create.mockResolvedValue(created);

      const result = await service.create(data);

      expect(mockPrisma.collectionPoint.create).toHaveBeenCalledWith({ data });
      expect(result).toEqual(created);
    });
  });
});
