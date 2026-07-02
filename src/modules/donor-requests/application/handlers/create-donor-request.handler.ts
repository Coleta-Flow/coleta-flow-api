import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { CreateDonorRequestCommand } from '../commands/create-donor-request.command';
import { EventStoreService } from '../../../event-store/event-store.service';
import { BusinessEventType } from '@prisma/client';

@CommandHandler(CreateDonorRequestCommand)
@Injectable()
export class CreateDonorRequestHandler implements ICommandHandler<CreateDonorRequestCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventStore: EventStoreService,
  ) {}

  async execute(command: CreateDonorRequestCommand) {
    const trackingCode = `CF-${Date.now().toString(36).toUpperCase()}`;

    const request = await this.prisma.$transaction(async (tx) => {
      // Find or create donor by whatsapp (unique identifier for public form)
      let donorId: string | undefined;

      if (command.donorWhatsapp) {
        let donor = await tx.donor.findFirst({
          where: {
            OR: [
              { whatsapp: command.donorWhatsapp },
              ...(command.donorEmail ? [{ email: command.donorEmail }] : []),
            ],
            deletedAt: null,
          },
        });

        if (!donor) {
          donor = await tx.donor.create({
            data: {
              name: command.donorName,
              whatsapp: command.donorWhatsapp,
              email: command.donorEmail,
              city: command.city,
            },
          });
        }

        donorId = donor.id;
      }

      const donorRequest = await tx.donorRequest.create({
        data: {
          trackingCode,
          donorId,
          donorName: command.donorName,
          donorWhatsapp: command.donorWhatsapp,
          donorEmail: command.donorEmail,
          address: command.address,
          city: command.city,
          materialTypeId: command.materialTypeId,
          description: command.description,
          estimatedWeightKg: command.estimatedWeightKg,
          bestTimeForPickup: command.bestTimeForPickup,
        },
      });

      if (command.photoIds.length > 0) {
        const fileAssets = await tx.fileAsset.findMany({
          where: { id: { in: command.photoIds } },
        });

        await tx.donorRequestPhoto.createMany({
          data: fileAssets.map((fa) => ({
            donorRequestId: donorRequest.id,
            url: fa.url,
            filename: fa.filename,
            sizeBytes: fa.sizeBytes ?? undefined,
            mimeType: fa.mimeType ?? undefined,
          })),
        });
      }

      return donorRequest;
    });

    await this.eventStore.save({
      entityType: 'DonorRequest',
      entityId: request.id,
      type: BusinessEventType.DONOR_REQUEST_CREATED,
      payload: {
        trackingCode,
        city: command.city,
        materialTypeId: command.materialTypeId,
      },
    });

    return { id: request.id, trackingCode, message: 'Solicitação criada com sucesso.' };
  }
}
