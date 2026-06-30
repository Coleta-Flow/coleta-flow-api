import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class CollectionPointsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(city?: string) {
    return this.prisma.collectionPoint.findMany({
      where: { active: true, deletedAt: null, ...(city ? { city } : {}) },
      orderBy: { name: 'asc' },
    });
  }

  findById(id: string) {
    return this.prisma.collectionPoint.findFirst({ where: { id } });
  }

  create(data: {
    name: string; address: string; city: string;
    lat: number; lng: number; phone?: string; operatingHours?: string;
  }) {
    return this.prisma.collectionPoint.create({ data });
  }
}
