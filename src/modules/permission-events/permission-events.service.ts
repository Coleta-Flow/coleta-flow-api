import { Injectable } from '@nestjs/common';
import { PermissionType, PermissionEventStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { TrackingGateway } from '../tracking/presentation/gateways/tracking.gateway';
import { CreatePermissionEventDto } from './dto/create-permission-event.dto';

const PERMISSION_LABEL: Record<PermissionType, string> = {
  LOCATION_FOREGROUND: 'localização (foreground)',
  LOCATION_BACKGROUND: 'localização (background)',
};

const STATUS_LABEL: Record<PermissionEventStatus, string> = {
  GRANTED: 'concedeu',
  DENIED: 'negou',
  REVOKED: 'revogou',
};

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly trackingGateway: TrackingGateway,
  ) {}

  async create(userId: string, dto: CreatePermissionEventDto) {
    const [event, user] = await Promise.all([
      this.prisma.driverPermissionEvent.create({ data: { ...dto, userId } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    ]);

    const driverName = user?.name ?? 'Motorista';
    const level = dto.status === 'GRANTED' ? 'info' : dto.status === 'DENIED' ? 'warning' : 'error';
    this.trackingGateway.emitAdminNotification(
      `${driverName} ${STATUS_LABEL[dto.status]} a permissão de ${PERMISSION_LABEL[dto.permissionType]}`,
      level,
    );

    return event;
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
