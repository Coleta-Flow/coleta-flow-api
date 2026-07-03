import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class DeclarationFilesService {
  constructor(private readonly prisma: PrismaService) {}

  resolvePdfPath(declaration: { pdfUrl: string | null; code: string }) {
    if (!declaration.pdfUrl) {
      throw new NotFoundException('PDF não encontrado.');
    }

    const filePath = path.join(process.cwd(), declaration.pdfUrl);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Arquivo não encontrado.');
    }

    return { filePath, filename: `${declaration.code}.pdf` };
  }

  async getById(id: string) {
    const declaration = await this.prisma.declaration.findFirst({ where: { id } });
    if (!declaration) throw new NotFoundException('Declaração não encontrada.');
    return declaration;
  }

  async getForDonorRequest(requestId: string, userId: string, email: string) {
    const request = await this.prisma.donorRequest.findFirst({
      where: {
        id: requestId,
        OR: [{ donor: { userId } }, { donorEmail: email }],
      },
      include: { declaration: true },
    });

    if (!request?.declaration) {
      throw new NotFoundException('Declaração não encontrada para esta solicitação.');
    }

    return request.declaration;
  }
}
