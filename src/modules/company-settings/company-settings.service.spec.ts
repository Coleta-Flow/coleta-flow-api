import { Test, TestingModule } from '@nestjs/testing';
import { CompanySettingsService } from './company-settings.service';
import { PrismaService } from '../../database/prisma/prisma.service';

const mockPrisma = {
  companySetting: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

describe('CompanySettingsService', () => {
  let service: CompanySettingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CompanySettingsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<CompanySettingsService>(CompanySettingsService);
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('returns the existing settings when present', async () => {
      const settings = { id: 's1', companyName: 'EcoLogi' };
      mockPrisma.companySetting.findFirst.mockResolvedValue(settings);

      const result = await service.get();

      expect(result).toEqual(settings);
      expect(mockPrisma.companySetting.create).not.toHaveBeenCalled();
    });

    it('creates default settings when none exist', async () => {
      mockPrisma.companySetting.findFirst.mockResolvedValue(null);
      const created = { id: 's1' };
      mockPrisma.companySetting.create.mockResolvedValue(created);

      const result = await service.get();

      expect(mockPrisma.companySetting.create).toHaveBeenCalledWith({ data: {} });
      expect(result).toEqual(created);
    });
  });

  describe('update', () => {
    it('updates existing settings', async () => {
      const settings = { id: 's1', companyName: 'EcoLogi' };
      mockPrisma.companySetting.findFirst.mockResolvedValue(settings);
      const updated = { id: 's1', companyName: 'EcoLogi Reciclagem' };
      mockPrisma.companySetting.update.mockResolvedValue(updated);

      const result = await service.update({ companyName: 'EcoLogi Reciclagem' });

      expect(mockPrisma.companySetting.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { companyName: 'EcoLogi Reciclagem' },
      });
      expect(result).toEqual(updated);
    });

    it('creates settings with the dto when none exist yet', async () => {
      mockPrisma.companySetting.findFirst.mockResolvedValue(null);
      const created = { id: 's1', companyName: 'EcoLogi Reciclagem' };
      mockPrisma.companySetting.create.mockResolvedValue(created);

      const result = await service.update({ companyName: 'EcoLogi Reciclagem' });

      expect(mockPrisma.companySetting.create).toHaveBeenCalledWith({
        data: { companyName: 'EcoLogi Reciclagem' },
      });
      expect(mockPrisma.companySetting.update).not.toHaveBeenCalled();
      expect(result).toEqual(created);
    });
  });
});
