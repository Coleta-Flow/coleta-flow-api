import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { DonorPortalService } from './donor-portal.service';
import { PrismaService } from '../../database/prisma/prisma.service';

const mockPrisma = {
  donor: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  donorRequest: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
  fileAsset: {
    findMany: jest.fn(),
  },
  donorRequestPhoto: {
    createMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('DonorPortalService', () => {
  let service: DonorPortalService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DonorPortalService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<DonorPortalService>(DonorPortalService);
    jest.clearAllMocks();
  });

  const donor = {
    id: 'donor-1',
    userId: 'user-1',
    email: 'donor@email.com',
    name: 'Maria',
    whatsapp: '(85) 99999-0000',
    street: 'Rua A',
    number: '10',
    complement: null,
    neighborhood: 'Centro',
    city: 'Fortaleza',
  };

  describe('getMe', () => {
    it('throws NotFoundException when no donor profile exists', async () => {
      mockPrisma.donor.findFirst.mockResolvedValue(null);

      await expect(service.getMe('user-1', 'donor@email.com')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when donor belongs to another user', async () => {
      mockPrisma.donor.findFirst.mockResolvedValue({ ...donor, userId: 'other-user' });

      await expect(service.getMe('user-1', 'donor@email.com')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('links the donor profile to the user when userId is not yet set', async () => {
      mockPrisma.donor.findFirst.mockResolvedValue({ ...donor, userId: null });
      mockPrisma.donor.update.mockResolvedValue({ ...donor, userId: 'user-1' });
      mockPrisma.donorRequest.findMany.mockResolvedValue([]);
      mockPrisma.donor.findUnique.mockResolvedValue(donor);

      await service.getMe('user-1', 'donor@email.com');

      expect(mockPrisma.donor.update).toHaveBeenCalledWith({
        where: { id: 'donor-1' },
        data: { userId: 'user-1' },
      });
    });

    it('returns donor and summary when profile matches the user', async () => {
      mockPrisma.donor.findFirst.mockResolvedValue(donor);
      mockPrisma.donorRequest.findMany.mockResolvedValue([]);
      mockPrisma.donor.findUnique.mockResolvedValue(donor);

      const result = await service.getMe('user-1', 'donor@email.com');

      expect(result.donor).toEqual(donor);
      expect(result.summary).toEqual({
        totalRequests: 0,
        totalWeightCollectedKg: 0,
        lastRequest: null,
      });
    });
  });

  describe('listRequests', () => {
    it('returns paginated requests scoped to the donor', async () => {
      mockPrisma.donor.findFirst.mockResolvedValue(donor);
      mockPrisma.donorRequest.findMany.mockResolvedValue([{ id: 'dr1' }]);
      mockPrisma.donorRequest.count.mockResolvedValue(1);

      const result = await service.listRequests('user-1', 'donor@email.com', 2, 10);

      expect(mockPrisma.donorRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { OR: [{ donorId: 'donor-1' }, { donorEmail: 'donor@email.com' }] },
          skip: 10,
          take: 10,
        }),
      );
      expect(result).toEqual({ data: [{ id: 'dr1' }], total: 1, page: 2, limit: 10 });
    });

    it('defaults to page 1 and limit 20', async () => {
      mockPrisma.donor.findFirst.mockResolvedValue(donor);
      mockPrisma.donorRequest.findMany.mockResolvedValue([]);
      mockPrisma.donorRequest.count.mockResolvedValue(0);

      const result = await service.listRequests('user-1', 'donor@email.com');

      expect(mockPrisma.donorRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  describe('getRequest', () => {
    it('returns the request when found and owned by the donor', async () => {
      mockPrisma.donor.findFirst.mockResolvedValue(donor);
      const request = { id: 'dr1' };
      mockPrisma.donorRequest.findFirst.mockResolvedValue(request);

      const result = await service.getRequest('user-1', 'donor@email.com', 'dr1');

      expect(result).toEqual(request);
    });

    it('throws NotFoundException when request does not exist for the donor', async () => {
      mockPrisma.donor.findFirst.mockResolvedValue(donor);
      mockPrisma.donorRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.getRequest('user-1', 'donor@email.com', 'missing'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getHistory', () => {
    it('builds history with total weight collected from weight records', async () => {
      mockPrisma.donor.findFirst.mockResolvedValue(donor);
      mockPrisma.donorRequest.findMany.mockResolvedValue([
        { id: 'dr1', weightRecord: { netWeightKg: 10 } },
        { id: 'dr2', weightRecord: { netWeightKg: 5.5 } },
        { id: 'dr3', weightRecord: null },
      ]);
      mockPrisma.donor.findUnique.mockResolvedValue(donor);

      const result = await service.getHistory('user-1', 'donor@email.com');

      expect(result.summary).toEqual({
        totalRequests: 3,
        totalWeightCollectedKg: 15.5,
        lastRequest: { id: 'dr1', weightRecord: { netWeightKg: 10 } },
      });
    });
  });

  describe('createRequest', () => {
    const dto = {
      materialTypeId: 'mt1',
      description: 'Sofá velho',
      bestTimeForPickup: 'Manhã',
    };

    it('creates the donor request within a transaction and returns tracking info', async () => {
      mockPrisma.donor.findFirst.mockResolvedValue(donor);
      const createdRequest = { id: 'dr1' };
      mockPrisma.donorRequest.create.mockResolvedValue(createdRequest);
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockPrisma));

      const result = await service.createRequest('user-1', 'donor@email.com', dto);

      expect(result.id).toBe('dr1');
      expect(result.trackingCode).toMatch(/^CF-/);
      expect(result.message).toBe('Solicitação criada com sucesso.');
      expect(mockPrisma.donorRequestPhoto.createMany).not.toHaveBeenCalled();
    });

    it('attaches photos when photoIds are provided', async () => {
      mockPrisma.donor.findFirst.mockResolvedValue(donor);
      const createdRequest = { id: 'dr1' };
      const fileAssets = [
        { id: 'f1', url: 'http://x/f1.png', filename: 'f1.png', sizeBytes: 100, mimeType: 'image/png' },
      ];
      mockPrisma.donorRequest.create.mockResolvedValue(createdRequest);
      mockPrisma.fileAsset.findMany.mockResolvedValue(fileAssets);
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockPrisma));

      await service.createRequest('user-1', 'donor@email.com', { ...dto, photoIds: ['f1'] });

      expect(mockPrisma.donorRequestPhoto.createMany).toHaveBeenCalledWith({
        data: [
          {
            donorRequestId: 'dr1',
            url: 'http://x/f1.png',
            filename: 'f1.png',
            sizeBytes: 100,
            mimeType: 'image/png',
          },
        ],
      });
    });

    it('throws NotFoundException when donor profile does not exist', async () => {
      mockPrisma.donor.findFirst.mockResolvedValue(null);

      await expect(service.createRequest('user-1', 'donor@email.com', dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
