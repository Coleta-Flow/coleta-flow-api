import { Injectable } from '@nestjs/common';
import { BusinessEventType } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';

interface SaveEventDto {
  entityType: string;
  entityId: string;
  type: BusinessEventType;
  payload: Record<string, unknown>;
}

@Injectable()
export class EventStoreService {
  constructor(private readonly prisma: PrismaService) {}

  async save(dto: SaveEventDto): Promise<void> {
    await this.prisma.businessEvent.create({
      data: {
        entityType: dto.entityType,
        entityId: dto.entityId,
        type: dto.type,
        payload: dto.payload as object,
      },
    });
  }

  async findByEntity(entityType: string, entityId: string) {
    return this.prisma.businessEvent.findMany({
      where: { entityType, entityId },
      orderBy: { occurredAt: 'asc' },
    });
  }
}
