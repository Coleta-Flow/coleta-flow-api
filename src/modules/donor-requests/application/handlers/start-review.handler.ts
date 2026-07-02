import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Injectable, NotFoundException } from '@nestjs/common';
import { DonorRequestStatus, BusinessEventType } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { EventStoreService } from '../../../event-store/event-store.service';
import { StartReviewCommand } from '../commands/start-review.command';
import { DonorRequestStatusVO } from '../../domain/value-objects/donor-request-status.vo';

@CommandHandler(StartReviewCommand)
@Injectable()
export class StartReviewHandler implements ICommandHandler<StartReviewCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventStore: EventStoreService,
  ) {}

  async execute(command: StartReviewCommand) {
    const request = await this.prisma.donorRequest.findUnique({
      where: { id: command.requestId },
    });

    if (!request) throw new NotFoundException('Solicitação não encontrada.');

    const statusVO = new DonorRequestStatusVO(request.status);
    const nextStatus = statusVO.transitionTo(DonorRequestStatus.UNDER_REVIEW);

    const updated = await this.prisma.donorRequest.update({
      where: { id: command.requestId },
      data: { status: nextStatus.current },
    });

    await this.eventStore.save({
      entityType: 'DonorRequest',
      entityId: command.requestId,
      type: BusinessEventType.DONOR_REQUEST_REVIEWED,
      payload: { operatorId: command.operatorId },
    });

    return updated;
  }
}
