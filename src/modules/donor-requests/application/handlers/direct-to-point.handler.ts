import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Injectable, NotFoundException } from '@nestjs/common';
import { DonorRequestStatus, BusinessEventType } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { EventStoreService } from '../../../event-store/event-store.service';
import { DirectToCollectionPointCommand } from '../commands/direct-to-point.command';
import { DonorRequestStatusVO } from '../../domain/value-objects/donor-request-status.vo';

@CommandHandler(DirectToCollectionPointCommand)
@Injectable()
export class DirectToCollectionPointHandler implements ICommandHandler<DirectToCollectionPointCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventStore: EventStoreService,
  ) {}

  async execute(command: DirectToCollectionPointCommand) {
    const [request, point] = await Promise.all([
      this.prisma.donorRequest.findUnique({ where: { id: command.requestId } }),
      this.prisma.collectionPoint.findUnique({ where: { id: command.collectionPointId } }),
    ]);

    if (!request) throw new NotFoundException('Solicitação não encontrada.');
    if (!point) throw new NotFoundException('Ponto de coleta não encontrado.');

    const statusVO = new DonorRequestStatusVO(request.status);
    const nextStatus = statusVO.transitionTo(DonorRequestStatus.DIRECTED_TO_COLLECTION_POINT);

    const updated = await this.prisma.$transaction(async (tx) => {
      const req = await tx.donorRequest.update({
        where: { id: command.requestId },
        data: { status: nextStatus.current },
      });

      await tx.pickupDecision.create({
        data: {
          donorRequestId: command.requestId,
          willPickup: false,
          collectionPointId: command.collectionPointId,
          decidedByUserId: command.operatorId,
          notes: command.notes,
        },
      });

      return req;
    });

    await this.eventStore.save({
      entityType: 'DonorRequest',
      entityId: command.requestId,
      type: BusinessEventType.REQUEST_DIRECTED_TO_POINT,
      payload: { collectionPointId: command.collectionPointId, operatorId: command.operatorId },
    });

    return updated;
  }
}
