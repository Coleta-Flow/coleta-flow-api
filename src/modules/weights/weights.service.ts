import { Injectable, NotFoundException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { DonorRequestStatus, BusinessEventType } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { EventStoreService } from '../event-store/event-store.service';
import { DonorRequestStatusVO } from '../donor-requests/domain/value-objects/donor-request-status.vo';
import { GenerateDeclarationCommand } from '../declarations/application/commands/generate-declaration.command';

@Injectable()
export class WeightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventStore: EventStoreService,
    private readonly commandBus: CommandBus,
  ) {}

  async registerWeight(data: {
    donorRequestId: string;
    routeId?: string;
    collectionPointId?: string;
    grossWeightKg: number;
    netWeightKg: number;
    tareKg?: number;
    notes?: string;
    confirmedByUserId?: string;
  }) {
    const request = await this.prisma.donorRequest.findFirst({
      where: { id: data.donorRequestId },
      include: { route: { select: { id: true } } },
    });
    if (!request) throw new NotFoundException('Solicitação não encontrada.');

    const isPickupFlow = !!(request as any).route;
    const statusAfterWeighing = isPickupFlow
      ? DonorRequestStatus.WEIGHED
      : DonorRequestStatus.FINISHED;

    const weightRecord = await this.prisma.$transaction(async (tx) => {
      const weight = await tx.weightRecord.create({
        data: {
          donorRequestId: data.donorRequestId,
          routeId: data.routeId,
          collectionPointId: data.collectionPointId,
          grossWeightKg: data.grossWeightKg,
          netWeightKg: data.netWeightKg,
          tareKg: data.tareKg,
          notes: data.notes,
          confirmedByUserId: data.confirmedByUserId,
        },
      });

      const statusVO = new DonorRequestStatusVO(request.status);
      const nextStatus = statusVO.transitionTo(statusAfterWeighing);

      await tx.donorRequest.update({
        where: { id: data.donorRequestId },
        data: { status: nextStatus.current },
      });

      return weight;
    });

    await this.eventStore.save({
      entityType: 'DonorRequest',
      entityId: data.donorRequestId,
      type: BusinessEventType.WEIGHT_REGISTERED,
      payload: {
        grossWeightKg: data.grossWeightKg,
        netWeightKg: data.netWeightKg,
        tareKg: data.tareKg,
        collectionPointId: data.collectionPointId,
      },
    });

    // RF21 — Auto-generate declaration for pickup-flow requests
    if (isPickupFlow) {
      try {
        await this.commandBus.execute(
          new GenerateDeclarationCommand(data.donorRequestId, data.confirmedByUserId ?? 'system'),
        );
      } catch {
        // Declaration generation is best-effort; if it fails (e.g. missing data), do not break weight registration
      }
    }

    return weightRecord;
  }
}
