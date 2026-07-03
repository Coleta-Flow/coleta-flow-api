import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../../database/prisma/prisma.service';
import { ReportPdfFactory } from './infrastructure/pdf/report-pdf.factory';

const mockPrisma = {
  donorRequest: { count: jest.fn(), groupBy: jest.fn() },
  route: { count: jest.fn(), findMany: jest.fn() },
  weightRecord: { aggregate: jest.fn(), findMany: jest.fn() },
  declaration: { count: jest.fn() },
};

const mockReportPdfFactory = {
  generate: jest.fn(),
};

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ReportPdfFactory, useValue: mockReportPdfFactory },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    jest.clearAllMocks();
  });

  describe('getDashboard', () => {
    it('should return dashboard metrics', async () => {
      mockPrisma.donorRequest.count.mockResolvedValue(100);
      mockPrisma.route.count.mockResolvedValue(5);
      mockPrisma.weightRecord.aggregate.mockResolvedValue({ _sum: { netWeightKg: 500 } });
      mockPrisma.declaration.count.mockResolvedValue(80);
      mockPrisma.donorRequest.groupBy.mockResolvedValue([
        { status: 'PENDING', _count: { status: 30 } },
        { status: 'APPROVED', _count: { status: 20 } },
      ]);

      const result = await service.getDashboard();

      expect(result.totalRequests).toBe(100);
      expect(result.activeRoutes).toBe(5);
      expect(result.totalWeightCollectedKg).toBe(500);
      expect(result.declarationsGenerated).toBe(80);
      expect(result.requestsByStatus).toEqual({ PENDING: 30, APPROVED: 20 });
    });

    it('should handle zero weight', async () => {
      mockPrisma.donorRequest.count.mockResolvedValue(0);
      mockPrisma.route.count.mockResolvedValue(0);
      mockPrisma.weightRecord.aggregate.mockResolvedValue({ _sum: { netWeightKg: null } });
      mockPrisma.declaration.count.mockResolvedValue(0);
      mockPrisma.donorRequest.groupBy.mockResolvedValue([]);

      const result = await service.getDashboard();

      expect(result.totalWeightCollectedKg).toBe(0);
      expect(result.requestsByStatus).toEqual({});
    });

    it('should pass date filters', async () => {
      const startDate = '2026-01-01';
      const endDate = '2026-06-30';

      mockPrisma.donorRequest.count.mockResolvedValue(10);
      mockPrisma.route.count.mockResolvedValue(2);
      mockPrisma.weightRecord.aggregate.mockResolvedValue({ _sum: { netWeightKg: 100 } });
      mockPrisma.declaration.count.mockResolvedValue(5);
      mockPrisma.donorRequest.groupBy.mockResolvedValue([]);

      await service.getDashboard(startDate, endDate);

      expect(mockPrisma.donorRequest.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });
  });

  describe('getSummary', () => {
    it('should return grouped summaries', async () => {
      mockPrisma.weightRecord.findMany
        .mockResolvedValueOnce([
          {
            id: '1',
            netWeightKg: 100,
            donorRequest: { materialType: { name: 'Plástico' }, city: 'Fortaleza' },
          },
          {
            id: '2',
            netWeightKg: 50,
            donorRequest: { materialType: { name: 'Papel e papelão' }, city: 'Fortaleza' },
          },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockPrisma.route.findMany.mockResolvedValue([]);

      const result = await service.getSummary();

      expect(result.byType).toHaveLength(2);
      expect(result.byType[0].materialTypeName).toBe('Plástico');
      expect(result.byRegion).toEqual([]);
      expect(result.byDriver).toEqual([]);
    });
  });

  describe('getEfficiency', () => {
    it('should calculate efficiency from finished routes', async () => {
      const startedAt = new Date('2026-01-01T08:00:00Z');
      const finishedAt = new Date('2026-01-01T12:00:00Z');

      mockPrisma.route.findMany.mockResolvedValue([
        {
          id: 'route-1',
          startedAt,
          finishedAt,
          driver: { user: { name: 'João' } },
          stops: [
            { sequence: 0, lat: -3.7319, lng: -38.5267 },
            { sequence: 1, lat: -3.734, lng: -38.53 },
          ],
          donorRequest: { weightRecord: { netWeightKg: 200 } },
        },
      ]);

      const result = await service.getEfficiency();

      expect(result.summary.totalFinishedRoutes).toBe(1);
      expect(result.summary.totalHours).toBe(4);
      expect(result.summary.totalDistanceKm).toBeCloseTo(0.43, 0);
      expect(result.byDriver).toHaveLength(1);
      expect(result.byDriver[0].driverName).toBe('João');
      expect(result.byDriver[0].totalWeightKg).toBe(200);
    });

    it('should handle routes with no driver', async () => {
      const startedAt = new Date('2026-01-01T08:00:00Z');
      const finishedAt = new Date('2026-01-01T10:00:00Z');

      mockPrisma.route.findMany.mockResolvedValue([
        {
          id: 'route-1',
          startedAt,
          finishedAt,
          driver: null,
          stops: [],
          donorRequest: { weightRecord: null },
        },
      ]);

      const result = await service.getEfficiency();

      expect(result.byDriver[0].driverName).toBe('Não atribuído');
      expect(result.byDriver[0].totalWeightKg).toBe(0);
    });

    it('should return empty summary when no finished routes', async () => {
      mockPrisma.route.findMany.mockResolvedValue([]);

      const result = await service.getEfficiency();

      expect(result.summary.totalFinishedRoutes).toBe(0);
      expect(result.summary.totalHours).toBe(0);
      expect(result.summary.totalDistanceKm).toBe(0);
      expect(result.summary.avgSpeedKmh).toBe(0);
      expect(result.byDriver).toEqual([]);
    });
  });

  describe('getSustainability', () => {
    it('should calculate CO2 avoided using known factors', async () => {
      const records = [
        {
          netWeightKg: 100,
          donorRequest: { materialType: { name: 'Plástico' } },
        },
        {
          netWeightKg: 50,
          donorRequest: { materialType: { name: 'Papel e papelão' } },
        },
      ];

      mockPrisma.weightRecord.findMany.mockResolvedValue(records);

      const result = await service.getSustainability();

      // Plástico: 100 * 1.5 = 150 kg CO2
      // Papel: 50 * 0.9 = 45 kg CO2
      expect(result.totalWeightCollectedKg).toBe(150);
      expect(result.totalCo2AvoidedKg).toBeCloseTo(195, 1);
      expect(result.totalCo2AvoidedTons).toBeCloseTo(0.2, 0);
      expect(result.byMaterial).toHaveLength(2);
      expect(result.byMaterial[0].material).toBe('Plástico');
      expect(result.byMaterial[0].co2SavedKg).toBe(150);
    });

    it('should use default factor for unknown materials', async () => {
      mockPrisma.weightRecord.findMany.mockResolvedValue([
        {
          netWeightKg: 10,
          donorRequest: { materialType: { name: 'Borracha' } },
        },
      ]);

      const result = await service.getSustainability();

      expect(result.totalCo2AvoidedKg).toBe(5); // 10 * 0.5 default
    });

    it('should return zeros for empty records', async () => {
      mockPrisma.weightRecord.findMany.mockResolvedValue([]);

      const result = await service.getSustainability();

      expect(result.totalWeightCollectedKg).toBe(0);
      expect(result.totalCo2AvoidedKg).toBe(0);
      expect(result.byMaterial).toEqual([]);
    });
  });

  describe('exportCsv', () => {
    it('should generate CSV with all sections', async () => {
      mockPrisma.weightRecord.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockPrisma.route.findMany.mockResolvedValue([]);

      const csv = await service.exportCsv();

      expect(csv).toContain('=== RESUMO POR TIPO DE MATERIAL ===');
      expect(csv).toContain('=== RESUMO POR REGIÃO ===');
      expect(csv).toContain('=== EFICIÊNCIA POR MOTORISTA ===');
      expect(csv).toContain('=== SUSTENTABILIDADE ===');
    });
  });
});
