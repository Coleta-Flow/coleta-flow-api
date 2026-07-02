import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DonorService } from './donor.service';
import { PrismaService } from '../../database/prisma/prisma.service';

const mockPrisma = {
  donor: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  donorRequest: {
    findMany: jest.fn(),
  },
};

describe('DonorService', () => {
  let service: DonorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DonorService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<DonorService>(DonorService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a donor', async () => {
      const dto = {
        name: 'João',
        cpfCnpj: '12345678901',
        email: 'joao@email.com',
        city: 'Fortaleza',
      };

      mockPrisma.donor.findUnique.mockResolvedValue(null);
      mockPrisma.donor.findFirst.mockResolvedValue(null);
      mockPrisma.donor.create.mockResolvedValue({ id: 'donor-1', ...dto });

      const result = await service.create(dto);

      expect(mockPrisma.donor.create).toHaveBeenCalledWith({ data: dto });
      expect(result.id).toBe('donor-1');
    });

    it('should throw ConflictException for duplicate CPF/CNPJ', async () => {
      mockPrisma.donor.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create({ name: 'João', cpfCnpj: '12345678901', city: 'Fortaleza' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException for duplicate email', async () => {
      mockPrisma.donor.findUnique.mockResolvedValue(null);
      mockPrisma.donor.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create({ name: 'João', email: 'duplicate@email.com', city: 'Fortaleza' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow creating donor without CPF/CNPJ', async () => {
      mockPrisma.donor.findFirst.mockResolvedValue(null);
      mockPrisma.donor.create.mockResolvedValue({ id: 'donor-1' });

      const result = await service.create({ name: 'Ana', city: 'Fortaleza' });

      expect(mockPrisma.donor.findUnique).not.toHaveBeenCalled();
      expect(result.id).toBe('donor-1');
    });
  });

  describe('findAll', () => {
    it('should return paginated donors', async () => {
      const donors = [{ id: '1', name: 'João' }];
      mockPrisma.donor.findMany.mockResolvedValue(donors);
      mockPrisma.donor.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toEqual(donors);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should filter by city', async () => {
      mockPrisma.donor.findMany.mockResolvedValue([]);
      mockPrisma.donor.count.mockResolvedValue(0);

      await service.findAll({ city: 'Fortaleza' });

      expect(mockPrisma.donor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ city: { contains: 'Fortaleza' } }),
        }),
      );
    });

    it('should filter by active status', async () => {
      mockPrisma.donor.findMany.mockResolvedValue([]);
      mockPrisma.donor.count.mockResolvedValue(0);

      await service.findAll({ active: 'true' });

      expect(mockPrisma.donor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ active: true }),
        }),
      );
    });

    it('should apply default pagination when not provided', async () => {
      mockPrisma.donor.findMany.mockResolvedValue([]);
      mockPrisma.donor.count.mockResolvedValue(0);

      await service.findAll({});

      expect(mockPrisma.donor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a donor by id', async () => {
      const donor = { id: 'donor-1', name: 'João', deletedAt: null };
      mockPrisma.donor.findUnique.mockResolvedValue(donor);

      const result = await service.findOne('donor-1');

      expect(result).toEqual(donor);
    });

    it('should throw NotFoundException when donor is soft-deleted', async () => {
      mockPrisma.donor.findUnique.mockResolvedValue({ id: 'donor-1', deletedAt: new Date() });

      await expect(service.findOne('donor-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when donor does not exist', async () => {
      mockPrisma.donor.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a donor', async () => {
      const existingDonor = { id: 'donor-1', name: 'João', cpfCnpj: '123', deletedAt: null };
      const updateDto = { name: 'João Silva' };

      mockPrisma.donor.findUnique.mockResolvedValue(existingDonor);
      mockPrisma.donor.update.mockResolvedValue({ ...existingDonor, ...updateDto });

      const result = await service.update('donor-1', updateDto);

      expect(mockPrisma.donor.update).toHaveBeenCalledWith({
        where: { id: 'donor-1' },
        data: updateDto,
      });
      expect(result.name).toBe('João Silva');
    });

    it('should throw NotFoundException when donor does not exist', async () => {
      mockPrisma.donor.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', { name: 'Novo' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should check CPF/CNPJ conflict only when value changed', async () => {
      const existingDonor = { id: 'donor-1', name: 'João', cpfCnpj: '123', deletedAt: null };
      mockPrisma.donor.findUnique.mockResolvedValueOnce(existingDonor);

      await service.update('donor-1', { cpfCnpj: '123' });

      expect(mockPrisma.donor.findUnique).toHaveBeenCalledTimes(1); // só a busca inicial
    });
  });

  describe('remove', () => {
    it('should soft delete a donor', async () => {
      const donor = { id: 'donor-1', name: 'João', deletedAt: null };
      mockPrisma.donor.findUnique.mockResolvedValue(donor);
      mockPrisma.donor.update.mockResolvedValue({
        ...donor,
        active: false,
        deletedAt: expect.any(Date),
      });

      await service.remove('donor-1');

      expect(mockPrisma.donor.update).toHaveBeenCalledWith({
        where: { id: 'donor-1' },
        data: { active: false, deletedAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundException for non-existent donor', async () => {
      mockPrisma.donor.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getHistory', () => {
    it('should return donor history with summary', async () => {
      const donor = { id: 'donor-1', name: 'João', deletedAt: null };
      const requests = [
        {
          id: 'req-1',
          weightRecord: { netWeightKg: 100 },
          materialType: { name: 'Plástico' },
          route: null,
        },
      ];

      mockPrisma.donor.findUnique.mockResolvedValue(donor);
      mockPrisma.donorRequest.findMany.mockResolvedValue(requests);

      const result = await service.getHistory('donor-1');

      expect(result.donor).toEqual(donor);
      expect(result.requests).toEqual(requests);
      expect(result.summary.totalRequests).toBe(1);
      expect(result.summary.totalWeightCollectedKg).toBe(100);
      expect(result.summary.lastRequest).toEqual(requests[0]);
    });

    it('should return zero weight when no weight records exist', async () => {
      const donor = { id: 'donor-1', name: 'João', deletedAt: null };
      mockPrisma.donor.findUnique.mockResolvedValue(donor);
      mockPrisma.donorRequest.findMany.mockResolvedValue([
        { id: 'req-1', weightRecord: null, materialType: null, route: null },
      ]);

      const result = await service.getHistory('donor-1');

      expect(result.summary.totalWeightCollectedKg).toBe(0);
    });

    it('should throw NotFoundException for non-existent donor', async () => {
      mockPrisma.donor.findUnique.mockResolvedValue(null);

      await expect(service.getHistory('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
