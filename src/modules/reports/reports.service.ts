import { Injectable } from '@nestjs/common';
import { DonorRequestStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private dateFilter(startDate?: string, endDate?: string) {
    if (!startDate && !endDate) return {};
    const filter: Record<string, Date> = {};
    if (startDate) filter.gte = new Date(startDate);
    if (endDate) filter.lte = new Date(endDate);
    return { createdAt: filter };
  }

  async getDashboard(startDate?: string, endDate?: string) {
    const dateWhere = this.dateFilter(startDate, endDate);

    const requestWhere = { deletedAt: null, ...dateWhere };
    const routeWhere = { ...dateWhere };
    const weightWhere = { ...dateWhere };
    const declarationWhere = { ...dateWhere };

    const [
      totalRequests,
      activeRoutes,
      totalWeightResult,
      totalDeclarations,
      requestsByStatus,
    ] = await Promise.all([
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

  async getSummary(startDate?: string, endDate?: string) {
    const dateWhere = this.dateFilter(startDate, endDate);
    const weightWhere = { ...dateWhere };

    const [byType, byRegion, byDriver] = await Promise.all([
      this.volumeByType(weightWhere),
      this.volumeByRegion(weightWhere),
      this.volumeByDriver(weightWhere),
    ]);

    return { byType, byRegion, byDriver };
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
      select: { id: true, netWeightKg: true, routeId: true },
    });

    const routeIds = records
      .map((r) => r.routeId)
      .filter((id): id is string => id !== null);

    const routes = routeIds.length > 0
      ? await this.prisma.route.findMany({
          where: { id: { in: routeIds } },
          include: { driver: { include: { user: true } } },
        })
      : [];

    const routeDriverMap = new Map(routes.map((r) => [r.id, r.driver?.user?.name ?? 'Não atribuído']));

    const map = new Map<string, { driverName: string; totalKg: number; count: number }>();

    for (const record of records) {
      const driverName = record.routeId ? (routeDriverMap.get(record.routeId) ?? 'Não atribuído') : 'Não atribuído';
      const existing = map.get(driverName) ?? { driverName, totalKg: 0, count: 0 };
      existing.totalKg += Number(record.netWeightKg);
      existing.count += 1;
      map.set(driverName, existing);
    }

    return Array.from(map.values()).sort((a, b) => b.totalKg - a.totalKg);
  }
}
