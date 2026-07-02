import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DonorRequestStatus, BusinessEventType } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { DeclarationPdfFactory } from '../../infrastructure/pdf/declaration-pdf.factory';
import { EventStoreService } from '../../../event-store/event-store.service';
import { EmailService } from '../../../notifications/email.service';
import { GenerateDeclarationCommand } from '../commands/generate-declaration.command';
import {
  WeightRequiredError,
  DeclarationNotApplicableError,
} from '../../../../common/errors/domain.errors';
import * as fs from 'fs';
import * as path from 'path';

@CommandHandler(GenerateDeclarationCommand)
@Injectable()
export class GenerateDeclarationHandler implements ICommandHandler<GenerateDeclarationCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfFactory: DeclarationPdfFactory,
    private readonly eventStore: EventStoreService,
    private readonly emailService: EmailService,
  ) {}

  async execute(command: GenerateDeclarationCommand) {
    const { donorRequestId } = command;

    const donorRequest = await this.prisma.donorRequest.findUnique({
      where: { id: donorRequestId },
      include: {
        materialType: true,
        route: {
          include: {
            driver: { include: { user: true } },
            stops: { include: { collectionPoint: true } },
          },
        },
      },
    });

    if (!donorRequest) throw new NotFoundException('Solicitação não encontrada.');

    // Only pickup-flow requests (those with a driver route) generate declarations.
    // Requests directed to the collection point by the donor themselves do not.
    if (!donorRequest.route) throw new DeclarationNotApplicableError();

    const weightRecord = await this.prisma.weightRecord.findUnique({
      where: { donorRequestId },
      include: { collectionPoint: true },
    });
    if (!weightRecord) throw new WeightRequiredError();

    const existing = await this.prisma.declaration.findUnique({ where: { donorRequestId } });
    if (existing) return existing;

    const code = `DCL-${Date.now().toString(36).toUpperCase()}`;
    const validationToken = uuidv4();

    const collectionPoint =
      weightRecord.collectionPoint ??
      donorRequest.route?.stops?.find((s) => s.type === 'COLLECTION_POINT')?.collectionPoint;

    const pdfBuffer = await this.pdfFactory.generate({
      code,
      validationToken,
      generatedAt: new Date(),
      donor: {
        name: donorRequest.donorName,
        whatsapp: donorRequest.donorWhatsapp,
        email: donorRequest.donorEmail ?? undefined,
        address: donorRequest.address,
        city: donorRequest.city,
      },
      material: {
        type: donorRequest.materialType?.name ?? 'Não especificado',
        description: donorRequest.description,
      },
      weightKg: Number(weightRecord.netWeightKg),
      collectionDate: weightRecord.createdAt,
      collectionPoint: collectionPoint
        ? {
            name: collectionPoint.name,
            address: collectionPoint.address,
            city: collectionPoint.city,
          }
        : { name: 'Ponto de coleta', address: donorRequest.address, city: donorRequest.city },
      driver: donorRequest.route?.driver
        ? {
            name: donorRequest.route.driver.user.name,
            vehiclePlate: donorRequest.route.driver.vehiclePlate ?? undefined,
          }
        : undefined,
    });

    // Salva PDF em disco
    const uploadsDir = path.join(process.cwd(), 'uploads', 'declarations');
    fs.mkdirSync(uploadsDir, { recursive: true });
    const filename = `${code}.pdf`;
    fs.writeFileSync(path.join(uploadsDir, filename), pdfBuffer);
    const pdfUrl = `/uploads/declarations/${filename}`;

    const declaration = await this.prisma.$transaction(async (tx) => {
      const decl = await tx.declaration.create({
        data: {
          donorRequestId,
          weightRecordId: weightRecord.id,
          code,
          pdfUrl,
          validationToken,
        },
      });

      await tx.donorRequest.update({
        where: { id: donorRequestId },
        data: { status: DonorRequestStatus.DECLARATION_AVAILABLE },
      });

      return decl;
    });

    await this.eventStore.save({
      entityType: 'Declaration',
      entityId: declaration.id,
      type: BusinessEventType.DECLARATION_GENERATED,
      payload: { code, donorRequestId, weightKg: Number(weightRecord.netWeightKg) },
    });

    // RF23 — Send declaration by email if donor has an email address
    if (donorRequest.donorEmail) {
      try {
        await this.emailService.send({
          to: donorRequest.donorEmail,
          subject: `Declaração de Coleta — ${code}`,
          html: `
            <p>Olá <strong>${donorRequest.donorName}</strong>,</p>
            <p>Sua coleta foi concluída e a declaração ambiental já está disponível.</p>
            <p><strong>Código:</strong> ${code}</p>
            <p><strong>Peso registrado:</strong> ${Number(weightRecord.netWeightKg).toFixed(3)} kg</p>
            <p><strong>Material:</strong> ${donorRequest.materialType?.name ?? 'Não especificado'}</p>
            <p>A declaração segue em anexo.</p>
            <hr>
            <p style="color: #64748b; font-size: 12px;">EcoLogi — fluxos inteligentes para operações conscientes</p>
          `,
          attachments: [{ filename: `${code}.pdf`, content: pdfBuffer }],
        });
      } catch {
        // Email delivery is best-effort
      }
    }

    return declaration;
  }
}
