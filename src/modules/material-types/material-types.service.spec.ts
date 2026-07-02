import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MaterialTypesService } from './material-types.service';
import { PrismaService } from '../../database/prisma/prisma.service';

const mockPrisma = {
  materialType: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

describe('MaterialTypesService', () => {
  let service: MaterialTypesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MaterialTypesService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<MaterialTypesService>(MaterialTypesService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns only active material types by default', async () => {
      const types = [{ id: 'mt1', name: 'Plástico' }];
      mockPrisma.materialType.findMany.mockResolvedValue(types);

      const result = await service.findAll();

      expect(mockPrisma.materialType.findMany).toHaveBeenCalledWith({
        where: { active: true },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(types);
    });

    it('includes inactive material types when requested', async () => {
      mockPrisma.materialType.findMany.mockResolvedValue([]);

      await service.findAll(true);

      expect(mockPrisma.materialType.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('findById', () => {
    it('returns the material type when found', async () => {
      const type = { id: 'mt1', name: 'Plástico' };
      mockPrisma.materialType.findFirst.mockResolvedValue(type);

      const result = await service.findById('mt1');

      expect(result).toEqual(type);
    });

    it('throws NotFoundException when material type does not exist', async () => {
      mockPrisma.materialType.findFirst.mockResolvedValue(null);

      await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates a material type with the dto', async () => {
      const dto = { name: 'Vidro', unitOfMeasure: 'kg' };
      const created = { id: 'mt2', ...dto };
      mockPrisma.materialType.create.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(mockPrisma.materialType.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toEqual(created);
    });
  });

  describe('update', () => {
    it('updates the material type after checking it exists', async () => {
      mockPrisma.materialType.findFirst.mockResolvedValue({ id: 'mt1', name: 'Plástico' });
      const updated = { id: 'mt1', name: 'Plástico PET' };
      mockPrisma.materialType.update.mockResolvedValue(updated);

      const result = await service.update('mt1', { name: 'Plástico PET' });

      expect(mockPrisma.materialType.update).toHaveBeenCalledWith({
        where: { id: 'mt1' },
        data: { name: 'Plástico PET' },
      });
      expect(result).toEqual(updated);
    });

    it('throws NotFoundException when material type does not exist', async () => {
      mockPrisma.materialType.findFirst.mockResolvedValue(null);

      await expect(service.update('missing', { name: 'X' })).rejects.toThrow(NotFoundException);
      expect(mockPrisma.materialType.update).not.toHaveBeenCalled();
    });
  });

  describe('deactivate', () => {
    it('sets active to false after checking it exists', async () => {
      mockPrisma.materialType.findFirst.mockResolvedValue({ id: 'mt1', name: 'Plástico' });
      const deactivated = { id: 'mt1', active: false };
      mockPrisma.materialType.update.mockResolvedValue(deactivated);

      const result = await service.deactivate('mt1');

      expect(mockPrisma.materialType.update).toHaveBeenCalledWith({
        where: { id: 'mt1' },
        data: { active: false },
      });
      expect(result).toEqual(deactivated);
    });

    it('throws NotFoundException when material type does not exist', async () => {
      mockPrisma.materialType.findFirst.mockResolvedValue(null);

      await expect(service.deactivate('missing')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.materialType.update).not.toHaveBeenCalled();
    });
  });
});
