import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { UpdateDonorRequestCommand } from '../commands/update-donor-request.command';
import { EventStoreService } from '../../../event-store/event-store.service';

@CommandHandler(UpdateDonorRequestCommand)
@Injectable()
export class UpdateDonorRequestHandler implements ICommandHandler<UpdateDonorRequestCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventStore: EventStoreService,
  ) {}

  async execute(command: UpdateDonorRequestCommand) {
    const { requestId, ...data } = command;

    const request = await this.prisma.donorRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.deletedAt) {
      throw new NotFoundException('Solicitação não encontrada.');
    }

    const updateData: Record<string, unknown> = {};
    if (data.description !== undefined) updateData.description = data.description;
    if (data.estimatedWeightKg !== undefined) updateData.estimatedWeightKg = data.estimatedWeightKg;
    if (data.bestTimeForPickup !== undefined) updateData.bestTimeForPickup = data.bestTimeForPickup;
    if (data.operatorNotes !== undefined) updateData.operatorNotes = data.operatorNotes;

    const updated = await this.prisma.donorRequest.update({
      where: { id: requestId },
      data: updateData,
      include: { materialType: true, photos: true },
    });

    await this.eventStore.save({
      entityType: 'DONOR_REQUEST',
      entityId: requestId,
      type: 'DONOR_REQUEST_UPDATED',
      payload: { updatedFields: Object.keys(updateData) },
    });

    return updated;
  }
}
