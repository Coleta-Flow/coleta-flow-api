import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { GetDonorRequestDetailsQuery } from '../queries/get-donor-request-details.query';

@QueryHandler(GetDonorRequestDetailsQuery)
@Injectable()
export class GetDonorRequestDetailsHandler implements IQueryHandler<GetDonorRequestDetailsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetDonorRequestDetailsQuery) {
    const request = await this.prisma.donorRequest.findUnique({
      where: { id: query.id },
      include: {
        donor: true,
        materialType: true,
        photos: true,
        pickupDecision: { include: { collectionPoint: true } },
        route: { include: { driver: { include: { user: true } }, stops: true } },
        weightRecord: true,
        declaration: true,
      },
    });

    if (!request) throw new NotFoundException('Solicitação não encontrada.');

    return request;
  }
}
