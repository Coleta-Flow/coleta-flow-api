import { Injectable } from '@nestjs/common';
import { DonorRequestStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { haversineDistance } from '../../common/utils/geo.utils';
import { ReportPdfFactory } from './infrastructure/pdf/report-pdf.factory';
import type { EfficiencyReport, OverviewReport, SummaryReport, SustainabilityReport } from './reports.types';

const CO2_FACTORS: Record<string, number> = {
  'Papel e papelão': 0.9,
  Plástico: 1.5,
  Vidro: 0.6,
  Metal: 3.0,
  Eletrônicos: 1.2,
  'Óleo de cozinha': 2.5,
  Madeira: 0.7,
  Orgânico: 0.3,
};

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportPdfFactory: ReportPdfFactory,
  ) {}

  private dateFilter(startDate?: string, endDate?: string) {
    if (!startDate && !endDate) return {};
    const filter: Record<string, Date> = {};
    if (startDate) filter.gte = new Date(startDate);
    if (endDate) filter.lte = new Date(endDate);
    return { createdAt: filter };
  }

  private startedAtFilter(startDate?: string, endDate?: string) {
    if (!startDate && !endDate) return {};
    const filter: Record<string, Date> = {};
    if (startDate) filter.gte = new Date(startDate);
    if (endDate) filter.lte = new Date(endDate);
    return { startedAt: filter };
  }

  async getDashboard(startDate?: string, endDate?: string) {
    const dateWhere = this.dateFilter(startDate, endDate);

    const requestWhere = { deletedAt: null, ...dateWhere };
    const routeWhere = { ...dateWhere };
    const weightWhere = { ...dateWhere };
    const declarationWhere = { ...dateWhere };

    const [totalRequests, activeRoutes, totalWeightResult, totalDeclarations, requestsByStatus] =
      await Promise.all([
        this.prisma.donorRequest.count({ where: requestWhere }),
        this.prisma.route.count({ where: { ...routeWhere, status: 'IN_PROGRESS' } }),
        this.prisma.weightRecord.aggregate({ where: weightWhere, _sum: { netWeightKg: true } }),
        this.prisma.declaration.count({ where: declarationWhere }),
        this.prisma.donorRequest.groupBy({
          by: ['status'],
          where: requestWhere,
          _count: { status: true },
        }),
      ]);

    return {
      totalRequests,
      activeRoutes,
      totalWeightCollectedKg: Number(totalWeightResult._sum?.netWeightKg ?? 0),
      declarationsGenerated: totalDeclarations,
      requestsByStatus: Object.fromEntries(
        requestsByStatus.map((r) => [r.status, r._count.status]),
      ) as Record<DonorRequestStatus, number>,
    };
  }

  async getOverview(startDate?: string, endDate?: string): Promise<OverviewReport> {
    const [summary, efficiency, sustainability] = await Promise.all([
      this.getSummary(startDate, endDate),
      this.getEfficiency(startDate, endDate),
      this.getSustainability(startDate, endDate),
    ]);

    const totalCollections = summary.byType.reduce((sum, item) => sum + item.count, 0);

    return {
      period: {
        startDate: startDate ?? null,
        endDate: endDate ?? null,
        label: this.periodLabel(startDate, endDate),
      },
      totalWeightCollectedKg: sustainability.totalWeightCollectedKg,
      totalCo2AvoidedKg: sustainability.totalCo2AvoidedKg,
      totalFinishedRoutes: efficiency.summary.totalFinishedRoutes,
      totalDistanceKm: efficiency.summary.totalDistanceKm,
      totalCollections,
    };
  }

  async getSummary(startDate?: string, endDate?: string): Promise<SummaryReport> {
    const dateWhere = this.dateFilter(startDate, endDate);
    const weightWhere = { ...dateWhere };

    const [byType, byRegion, byDriver] = await Promise.all([
      this.volumeByType(weightWhere),
      this.volumeByRegion(weightWhere),
      this.volumeByDriver(weightWhere),
    ]);

    return { byType, byRegion, byDriver };
  }

  // RF26 — Efficiency report
  async getEfficiency(startDate?: string, endDate?: string): Promise<EfficiencyReport> {
    const dateWhere = this.startedAtFilter(startDate, endDate);

    const routes = await this.prisma.route.findMany({
      where: {
        status: 'FINISHED',
        startedAt: { not: null },
        finishedAt: { not: null },
        ...(startDate || endDate ? { startedAt: dateWhere.startedAt } : {}),
      },
      include: {
        driver: { include: { user: true } },
        stops: { orderBy: { sequence: 'asc' } },
        donorRequest: { include: { weightRecord: { select: { netWeightKg: true } } } },
      },
    });

    const driverStats = new Map<
      string,
      {
        driverName: string;
        totalRoutes: number;
        totalHours: number;
        totalDistanceKm: number;
        totalWeightKg: number;
      }
    >();

    let totalDistanceKm = 0;
    let totalHours = 0;

    for (const route of routes) {
      const hours =
        route.startedAt && route.finishedAt
          ? (route.finishedAt.getTime() - route.startedAt.getTime()) / 3_600_000
          : 0;

      const distanceKm = this.calculateRouteDistance(route.stops) / 1000;
      const weightKg = Number(route.donorRequest?.weightRecord?.netWeightKg ?? 0);

      totalDistanceKm += distanceKm;
      totalHours += hours;

      const driverName = route.driver?.user?.name ?? 'Não atribuído';
      const stats = driverStats.get(driverName) ?? {
        driverName,
        totalRoutes: 0,
        totalHours: 0,
        totalDistanceKm: 0,
        totalWeightKg: 0,
      };
      stats.totalRoutes += 1;
      stats.totalHours += hours;
      stats.totalDistanceKm += distanceKm;
      stats.totalWeightKg += weightKg;
      driverStats.set(driverName, stats);
    }

    return {
      summary: {
        totalFinishedRoutes: routes.length,
        totalHours: Math.round(totalHours * 100) / 100,
        totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
        avgSpeedKmh: totalHours > 0 ? Math.round((totalDistanceKm / totalHours) * 100) / 100 : 0,
      },
      byDriver: Array.from(driverStats.values())
        .map((d) => ({
          ...d,
          totalHours: Math.round(d.totalHours * 100) / 100,
          totalDistanceKm: Math.round(d.totalDistanceKm * 100) / 100,
          totalWeightKg: Math.round(d.totalWeightKg * 100) / 100,
        }))
        .sort((a, b) => b.totalRoutes - a.totalRoutes),
    };
  }

  // RF27 — Sustainability report
  async getSustainability(startDate?: string, endDate?: string): Promise<SustainabilityReport> {
    const dateWhere = this.dateFilter(startDate, endDate);
    const weightWhere = { ...dateWhere };

    const records = await this.prisma.weightRecord.findMany({
      where: weightWhere,
      include: { donorRequest: { include: { materialType: true } } },
    });

    const byMaterial = new Map<
      string,
      { material: string; weightKg: number; co2SavedKg: number }
    >();
    let totalWeightKg = 0;
    let totalCo2SavedKg = 0;

    for (const record of records) {
      const material = record.donorRequest.materialType.name;
      const weight = Number(record.netWeightKg);
      const factor = CO2_FACTORS[material] ?? 0.5;
      const co2 = weight * factor;

      totalWeightKg += weight;
      totalCo2SavedKg += co2;

      const existing = byMaterial.get(material) ?? { material, weightKg: 0, co2SavedKg: 0 };
      existing.weightKg += weight;
      existing.co2SavedKg += co2;
      byMaterial.set(material, existing);
    }

    return {
      totalWeightCollectedKg: Math.round(totalWeightKg * 100) / 100,
      totalCo2AvoidedKg: Math.round(totalCo2SavedKg * 100) / 100,
      totalCo2AvoidedTons: Math.round((totalCo2SavedKg / 1000) * 100) / 100,
      byMaterial: Array.from(byMaterial.values())
        .map((m) => ({
          ...m,
          weightKg: Math.round(m.weightKg * 100) / 100,
          co2SavedKg: Math.round(m.co2SavedKg * 100) / 100,
        }))
        .sort((a, b) => b.co2SavedKg - a.co2SavedKg),
    };
  }

  async exportPdf(startDate?: string, endDate?: string): Promise<Buffer> {
    const [summary, efficiency, sustainability] = await Promise.all([
      this.getSummary(startDate, endDate),
      this.getEfficiency(startDate, endDate),
      this.getSustainability(startDate, endDate),
    ]);

    return this.reportPdfFactory.generate({
      periodLabel: this.periodLabel(startDate, endDate),
      generatedAt: new Date(),
      summary,
      efficiency,
      sustainability,
    });
  }

  // RF30 — Export as CSV
  async exportCsv(startDate?: string, endDate?: string): Promise<string> {
    const [summary, efficiency, sustainability] = await Promise.all([
      this.getSummary(startDate, endDate),
      this.getEfficiency(startDate, endDate),
      this.getSustainability(startDate, endDate),
    ]);

    const rows: string[] = [];

    rows.push(`Relatório Eco Logi — ${this.periodLabel(startDate, endDate)}`);
    rows.push(`Gerado em,${new Date().toISOString()}`);
    rows.push('');

    rows.push('=== RESUMO POR TIPO DE MATERIAL ===');
    rows.push('material,peso_kg,coletas');
    for (const item of summary.byType) {
      rows.push(`${item.materialTypeName},${item.totalKg},${item.count}`);
    }

    rows.push('');
    rows.push('=== RESUMO POR REGIÃO ===');
    rows.push('cidade,peso_kg,coletas');
    for (const item of summary.byRegion) {
      rows.push(`${item.city},${item.totalKg},${item.count}`);
    }

    rows.push('');
    rows.push('=== EFICIÊNCIA POR MOTORISTA ===');
    rows.push('motorista,rotas,horas,distancia_km,peso_kg');
    for (const item of efficiency.byDriver) {
      rows.push(
        `${item.driverName},${item.totalRoutes},${item.totalHours},${item.totalDistanceKm},${item.totalWeightKg}`,
      );
    }

    rows.push('');
    rows.push('=== SUSTENTABILIDADE ===');
    rows.push(`peso_total_kg,${sustainability.totalWeightCollectedKg}`);
    rows.push(`co2_evitado_kg,${sustainability.totalCo2AvoidedKg}`);
    rows.push(`co2_evitado_toneladas,${sustainability.totalCo2AvoidedTons}`);
    rows.push('material,peso_kg,co2_evitado_kg');
    for (const item of sustainability.byMaterial) {
      rows.push(`${item.material},${item.weightKg},${item.co2SavedKg}`);
    }

    return `\uFEFF${rows.join('\n')}`;
  }

  private periodLabel(startDate?: string, endDate?: string): string {
    if (!startDate && !endDate) return 'Todo o período';
    if (startDate && endDate) {
      return `${this.formatDateLabel(startDate)} a ${this.formatDateLabel(endDate)}`;
    }
    if (startDate) return `A partir de ${this.formatDateLabel(startDate)}`;
    return `Até ${this.formatDateLabel(endDate!)}`;
  }

  private formatDateLabel(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('pt-BR');
  }

  private calculateRouteDistance(stops: { lat?: any; lng?: any }[]): number {
    let total = 0;
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i];
      const b = stops[i + 1];
      if (a.lat != null && a.lng != null && b.lat != null && b.lng != null) {
        total += haversineDistance(Number(a.lat), Number(a.lng), Number(b.lat), Number(b.lng));
      }
    }
    return total;
  }

  private async volumeByType(weightWhere: Record<string, unknown>) {
    const results = await this.prisma.weightRecord.findMany({
      where: weightWhere,
      include: { donorRequest: { include: { materialType: true } } },
    });

    const map = new Map<string, { materialTypeName: string; totalKg: number; count: number }>();

    for (const record of results) {
      const name = record.donorRequest.materialType.name;
      const existing = map.get(name) ?? { materialTypeName: name, totalKg: 0, count: 0 };
      existing.totalKg += Number(record.netWeightKg);
      existing.count += 1;
      map.set(name, existing);
    }

    return Array.from(map.values()).sort((a, b) => b.totalKg - a.totalKg);
  }

  private async volumeByRegion(weightWhere: Record<string, unknown>) {
    const results = await this.prisma.weightRecord.findMany({
      where: weightWhere,
      include: { donorRequest: true },
    });

    const map = new Map<string, { city: string; totalKg: number; count: number }>();

    for (const record of results) {
      const city = record.donorRequest.city;
      const existing = map.get(city) ?? { city, totalKg: 0, count: 0 };
      existing.totalKg += Number(record.netWeightKg);
      existing.count += 1;
      map.set(city, existing);
    }

    return Array.from(map.values()).sort((a, b) => b.totalKg - a.totalKg);
  }

  private async volumeByDriver(weightWhere: Record<string, unknown>) {
    const records = await this.prisma.weightRecord.findMany({
      where: weightWhere,
      include: {
        donorRequest: {
          include: {
            route: { include: { driver: { include: { user: true } } } },
          },
        },
      },
    });

    const map = new Map<string, { driverName: string; totalKg: number; count: number }>();

    for (const record of records) {
      const driverName =
        record.donorRequest.route?.driver?.user?.name ?? 'Não atribuído';
      const existing = map.get(driverName) ?? { driverName, totalKg: 0, count: 0 };
      existing.totalKg += Number(record.netWeightKg);
      existing.count += 1;
      map.set(driverName, existing);
    }

    return Array.from(map.values()).sort((a, b) => b.totalKg - a.totalKg);
  }
}
