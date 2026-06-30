import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import { ConfigService } from '@nestjs/config';

export interface DeclarationData {
  code: string;
  validationToken: string;
  generatedAt: Date;
  donor: {
    name: string;
    email?: string;
    whatsapp: string;
    address: string;
    city: string;
  };
  material: {
    type: string;
    description: string;
  };
  weightKg: number;
  collectionDate: Date;
  collectionPoint: {
    name: string;
    address: string;
    city: string;
  };
  driver?: {
    name: string;
    vehiclePlate?: string;
  };
}

@Injectable()
export class DeclarationPdfFactory {
  constructor(private readonly config: ConfigService) {}

  async generate(data: DeclarationData): Promise<Buffer> {
    const qrUrl = `${this.config.get('APP_URL')}/verificar/${data.validationToken}`;
    const qrBuffer = await QRCode.toBuffer(qrUrl, { width: 120, margin: 1 });

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .fillColor('#10B981')
        .text('ColetaFlow', { align: 'center' });

      doc
        .fontSize(12)
        .font('Helvetica')
        .fillColor('#475569')
        .text('fluxos inteligentes para operações conscientes', { align: 'center' });

      doc.moveDown();
      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .fillColor('#0F172A')
        .text('DECLARAÇÃO DE RECEBIMENTO DE MATERIAL', { align: 'center' });

      doc.moveDown();
      doc.fontSize(10).fillColor('#64748B').text(`Código: ${data.code}`, { align: 'right' });
      doc.text(`Data de emissão: ${this.formatDate(data.generatedAt)}`, { align: 'right' });

      doc.moveDown();
      this.renderSection(doc, 'DADOS DO SOLICITANTE / DOADOR');
      this.renderField(doc, 'Nome', data.donor.name);
      this.renderField(doc, 'WhatsApp', data.donor.whatsapp);
      if (data.donor.email) this.renderField(doc, 'E-mail', data.donor.email);
      this.renderField(doc, 'Endereço de Coleta', `${data.donor.address} — ${data.donor.city}`);

      doc.moveDown();
      this.renderSection(doc, 'MATERIAL RECEBIDO');
      this.renderField(doc, 'Tipo de Material', data.material.type);
      this.renderField(doc, 'Descrição', data.material.description);
      this.renderField(doc, 'Peso Real Confirmado', `${data.weightKg.toFixed(3)} kg`);
      this.renderField(doc, 'Data da Coleta / Recebimento', this.formatDate(data.collectionDate));

      doc.moveDown();
      this.renderSection(doc, 'PONTO DE COLETA');
      this.renderField(doc, 'Nome', data.collectionPoint.name);
      this.renderField(doc, 'Endereço', `${data.collectionPoint.address} — ${data.collectionPoint.city}`);

      if (data.driver) {
        doc.moveDown();
        this.renderSection(doc, 'MOTORISTA / COLETOR');
        this.renderField(doc, 'Nome', data.driver.name);
        if (data.driver.vehiclePlate) this.renderField(doc, 'Placa do Veículo', data.driver.vehiclePlate);
      }

      // QR Code
      doc.moveDown(2);
      doc.image(qrBuffer, { fit: [120, 120], align: 'center' });
      doc
        .fontSize(8)
        .fillColor('#64748B')
        .text(`Escaneie para verificar a autenticidade: ${qrUrl}`, { align: 'center' });

      doc.moveDown();
      doc
        .fontSize(8)
        .fillColor('#94A3B8')
        .text(
          'Este documento é gerado automaticamente pelo sistema ColetaFlow. A autenticidade pode ser verificada pelo QR Code acima.',
          { align: 'center' },
        );

      doc.end();
    });
  }

  private renderSection(doc: PDFKit.PDFDocument, title: string): void {
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#047857')
      .text(title);
    doc
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .strokeColor('#D1FAE5')
      .stroke();
    doc.moveDown(0.3);
  }

  private renderField(doc: PDFKit.PDFDocument, label: string, value: string): void {
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#334155').text(`${label}: `, { continued: true });
    doc.font('Helvetica').fillColor('#0F172A').text(value);
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }
}
