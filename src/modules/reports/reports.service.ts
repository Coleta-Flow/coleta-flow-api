import { Injectable } from '@nestjs/common';
import { DonorRequestStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const [
      totalRequests,
      activeRoutes,
      totalWeightResult,
      totalDeclarations,
      requestsByStatus,
    ] = await Promise.all([
      this.prisma.donorRequest.count({ where: { deletedAt: null } }),
      this.prisma.route.count({ where: { status: 'IN_PROGRESS' } }),
      this.prisma.weightRecord.aggregate({ _sum: { netWeightKg: true } }),
      this.prisma.declaration.count(),
      this.prisma.donorRequest.groupBy({
        by: ['status'],
        where: { deletedAt: null },
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
}
