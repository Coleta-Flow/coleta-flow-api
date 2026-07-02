import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { CreateDonorRequestCommand } from '../commands/create-donor-request.command';
import { EventStoreService } from '../../../event-store/event-store.service';
import { AuthService } from '../../../auth/auth.service';
import { BusinessEventType } from '@prisma/client';

function buildAddress(command: CreateDonorRequestCommand): string {
  const parts = [command.street, command.number, command.complement, command.neighborhood].filter(
    Boolean,
  );
  return parts.join(', ');
}

@CommandHandler(CreateDonorRequestCommand)
@Injectable()
export class CreateDonorRequestHandler implements ICommandHandler<CreateDonorRequestCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventStore: EventStoreService,
    private readonly authService: AuthService,
  ) {}

  async execute(command: CreateDonorRequestCommand) {
    const trackingCode = `CF-${Date.now().toString(36).toUpperCase()}`;
    const address = buildAddress(command);

    const existingUser = await this.prisma.user.findFirst({
      where: { email: command.donorEmail, deletedAt: null },
    });
    if (existingUser) {
      throw new ConflictException(
        'E-mail já possui conta. Faça login para acompanhar suas solicitações.',
      );
    }

    const donorRole = await this.prisma.role.findUnique({
      where: { name: UserRole.DONOR },
    });
    if (!donorRole) throw new Error('Role DONOR não encontrada no banco.');

    const hashedPassword = await bcrypt.hash(command.password, 10);

    const { request, userId } = await this.prisma.$transaction(async (tx) => {
      let donor = await tx.donor.findFirst({
        where: {
          OR: [
            { whatsapp: command.donorWhatsapp },
            { email: command.donorEmail },
            ...(command.cpfCnpj ? [{ cpfCnpj: command.cpfCnpj }] : []),
          ],
          deletedAt: null,
        },
      });

      if (donor?.userId) {
        throw new ConflictException('Este doador já possui conta. Faça login para continuar.');
      }

      const donorData = {
        name: command.donorName,
        whatsapp: command.donorWhatsapp,
        email: command.donorEmail,
        cpfCnpj: command.cpfCnpj,
        cep: command.cep,
        street: command.street,
        number: command.number,
        complement: command.complement,
        neighborhood: command.neighborhood,
        city: command.city,
        state: command.state,
      };

      if (donor) {
        donor = await tx.donor.update({
          where: { id: donor.id },
          data: donorData,
        });
      } else {
        donor = await tx.donor.create({ data: donorData });
      }

      const user = await tx.user.create({
        data: {
          name: command.donorName,
          email: command.donorEmail,
          password: hashedPassword,
          role: UserRole.DONOR,
          roleId: donorRole.id,
          phone: command.donorWhatsapp,
        },
      });

      await tx.donor.update({
        where: { id: donor.id },
        data: { userId: user.id },
      });

      const donorRequest = await tx.donorRequest.create({
        data: {
          trackingCode,
          donorId: donor.id,
          donorName: command.donorName,
          donorWhatsapp: command.donorWhatsapp,
          donorEmail: command.donorEmail,
          address,
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

      return { request: donorRequest, userId: user.id };
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

    const tokens = await this.authService.issueTokensForUser(userId);

    return {
      id: request.id,
      trackingCode,
      message: 'Solicitação criada com sucesso.',
      ...tokens,
    };
  }
}
