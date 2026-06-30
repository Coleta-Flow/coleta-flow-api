import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { ListDonorRequestsQuery } from '../queries/list-donor-requests.query';

@QueryHandler(ListDonorRequestsQuery)
@Injectable()
export class ListDonorRequestsHandler implements IQueryHandler<ListDonorRequestsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: ListDonorRequestsQuery) {
    const { status, city, page, limit } = query;
    const skip = (page - 1) * limit;

    const where = {
      deletedAt: null,
      ...(status ? { status: status as any } : {}),
      ...(city ? { city: { contains: city } } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.donorRequest.findMany({
        where,
        include: { materialType: true, photos: true, pickupDecision: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.donorRequest.count({ where }),
    ]);

    return { data, total, page, limit };
  }
}
