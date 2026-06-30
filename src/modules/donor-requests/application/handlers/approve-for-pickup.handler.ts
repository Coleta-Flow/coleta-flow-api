import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Injectable, NotFoundException } from '@nestjs/common';
import { DonorRequestStatus, BusinessEventType } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { EventStoreService } from '../../../event-store/event-store.service';
import { ApproveForPickupCommand } from '../commands/approve-for-pickup.command';
import { DonorRequestStatusVO } from '../../domain/value-objects/donor-request-status.vo';

@CommandHandler(ApproveForPickupCommand)
@Injectable()
export class ApproveForPickupHandler implements ICommandHandler<ApproveForPickupCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventStore: EventStoreService,
  ) {}

  async execute(command: ApproveForPickupCommand) {
    const request = await this.prisma.donorRequest.findUnique({
      where: { id: command.requestId },
    });

    if (!request) throw new NotFoundException('Solicitação não encontrada.');

    const statusVO = new DonorRequestStatusVO(request.status);
    const nextStatus = statusVO.transitionTo(DonorRequestStatus.APPROVED_FOR_PICKUP);

    const updated = await this.prisma.donorRequest.update({
      where: { id: command.requestId },
      data: { status: nextStatus.current },
    });

    await this.eventStore.save({
      entityType: 'DonorRequest',
      entityId: command.requestId,
      type: BusinessEventType.PICKUP_APPROVED,
      payload: { operatorId: command.operatorId },
    });

    return updated;
  }
}
