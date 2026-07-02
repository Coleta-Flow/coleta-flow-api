import { Injectable } from '@nestjs/common';
import { PermissionType, PermissionEventStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreatePermissionEventDto } from './dto/create-permission-event.dto';

export interface PermissionEventsQuery {
  userId?: string;
  permissionType?: PermissionType;
  status?: PermissionEventStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class PermissionEventsService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreatePermissionEventDto) {
    return this.prisma.driverPermissionEvent.create({
      data: { ...dto, userId },
    });
  }

  async findAll(query: PermissionEventsQuery) {
    const { userId, permissionType, status, startDate, endDate, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(userId && { userId }),
      ...(permissionType && { permissionType }),
      ...(status && { status }),
      ...((startDate || endDate) && {
        createdAt: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.driverPermissionEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.driverPermissionEvent.count({ where }),
    ]);

    return { data, total, page, limit };
  }
}
