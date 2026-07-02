import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DonorRequestStatus } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { CancelDonorRequestCommand } from '../commands/cancel-donor-request.command';
import { DonorRequestStatusVO } from '../../domain/value-objects/donor-request-status.vo';
import { EventStoreService } from '../../../event-store/event-store.service';

@CommandHandler(CancelDonorRequestCommand)
@Injectable()
export class CancelDonorRequestHandler implements ICommandHandler<CancelDonorRequestCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventStore: EventStoreService,
  ) {}

  async execute(command: CancelDonorRequestCommand) {
    const { requestId, reason } = command;

    const request = await this.prisma.donorRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.deletedAt) {
      throw new NotFoundException('Solicitação não encontrada.');
    }

    const statusVO = new DonorRequestStatusVO(request.status as DonorRequestStatus);

    if (!statusVO.canTransitionTo(DonorRequestStatus.CANCELLED)) {
      throw new BadRequestException(
        `Não é possível cancelar uma solicitação com status "${request.status}".`,
      );
    }

    const updated = await this.prisma.donorRequest.update({
      where: { id: requestId },
      data: {
        status: DonorRequestStatus.CANCELLED,
        cancelReason: reason ?? null,
      },
      include: { materialType: true, photos: true },
    });

    await this.eventStore.save({
      entityType: 'DONOR_REQUEST',
      entityId: requestId,
      type: 'REQUEST_CANCELLED',
      payload: { reason },
    });

    return updated;
  }
}
