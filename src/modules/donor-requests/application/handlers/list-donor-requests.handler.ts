import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { ListDonorRequestsQuery } from '../queries/list-donor-requests.query';

@QueryHandler(ListDonorRequestsQuery)
@Injectable()
export class ListDonorRequestsHandler implements IQueryHandler<ListDonorRequestsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: ListDonorRequestsQuery) {
    const { status, city, startDate, endDate, page, limit } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
      ...(status ? { status: status as any } : {}),
      ...(city ? { city: { contains: city } } : {}),
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.donorRequest.findMany({
        where,
        include: { donor: true, materialType: true, photos: true, pickupDecision: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.donorRequest.count({ where }),
    ]);

    return { data, total, page, limit };
  }
}
