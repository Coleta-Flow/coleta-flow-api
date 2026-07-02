import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class DonorPortalService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveDonor(userId: string, email: string) {
    const donor = await this.prisma.donor.findFirst({
      where: {
        deletedAt: null,
        OR: [{ userId }, { email }],
      },
    });

    if (!donor) {
      throw new NotFoundException(
        'Perfil de doador não encontrado. Solicite uma coleta para vincular sua conta.',
      );
    }

    if (!donor.userId) {
      await this.prisma.donor.update({
        where: { id: donor.id },
        data: { userId },
      });
    } else if (donor.userId !== userId) {
      throw new ForbiddenException('Acesso negado ao perfil de doador.');
    }

    return donor;
  }

  async getMe(userId: string, email: string) {
    const donor = await this.resolveDonor(userId, email);
    const history = await this.buildHistory(donor.id);
    return {
      donor,
      summary: history.summary,
    };
  }

  async listRequests(userId: string, email: string, page = 1, limit = 20) {
    const donor = await this.resolveDonor(userId, email);
    const skip = (page - 1) * limit;

    const where = {
      OR: [{ donorId: donor.id }, { donorEmail: email }],
    };

    const [data, total] = await Promise.all([
      this.prisma.donorRequest.findMany({
        where,
        include: {
          materialType: true,
          weightRecord: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.donorRequest.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async getRequest(userId: string, email: string, requestId: string) {
    const donor = await this.resolveDonor(userId, email);

    const request = await this.prisma.donorRequest.findFirst({
      where: {
        id: requestId,
        OR: [{ donorId: donor.id }, { donorEmail: email }],
      },
      include: {
        materialType: true,
        weightRecord: true,
        photos: true,
        declaration: true,
      },
    });

    if (!request) throw new NotFoundException('Solicitação não encontrada.');
    return request;
  }

  async getHistory(userId: string, email: string) {
    const donor = await this.resolveDonor(userId, email);
    return this.buildHistory(donor.id, email);
  }

  async createRequest(
    userId: string,
    email: string,
    dto: {
      materialTypeId: string;
      description: string;
      estimatedWeightKg?: number;
      bestTimeForPickup: string;
      photoIds?: string[];
    },
  ) {
    const donor = await this.resolveDonor(userId, email);
    const trackingCode = `CF-${Date.now().toString(36).toUpperCase()}`;

    const address = [donor.street, donor.number, donor.complement, donor.neighborhood]
      .filter(Boolean)
      .join(', ');

    const request = await this.prisma.$transaction(async (tx) => {
      const donorRequest = await tx.donorRequest.create({
        data: {
          trackingCode,
          donorId: donor.id,
          donorName: donor.name,
          donorWhatsapp: donor.whatsapp ?? '',
          donorEmail: donor.email ?? email,
          address: address || donor.city,
          city: donor.city,
          materialTypeId: dto.materialTypeId,
          description: dto.description,
          estimatedWeightKg: dto.estimatedWeightKg,
          bestTimeForPickup: dto.bestTimeForPickup,
        },
      });

      if (dto.photoIds?.length) {
        const fileAssets = await tx.fileAsset.findMany({
          where: { id: { in: dto.photoIds } },
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

    return {
      id: request.id,
      trackingCode,
      message: 'Solicitação criada com sucesso.',
    };
  }

  private async buildHistory(donorId: string, email?: string) {
    const requests = await this.prisma.donorRequest.findMany({
      where: {
        OR: [{ donorId }, ...(email ? [{ donorEmail: email }] : [])],
      },
      include: {
        materialType: true,
        weightRecord: true,
        route: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalWeight = requests.reduce(
      (acc, r) => acc + (r.weightRecord ? Number(r.weightRecord.netWeightKg) : 0),
      0,
    );

    const donor = await this.prisma.donor.findUnique({ where: { id: donorId } });

    return {
      donor,
      requests,
      summary: {
        totalRequests: requests.length,
        totalWeightCollectedKg: totalWeight,
        lastRequest: requests[0] ?? null,
      },
    };
  }
}
