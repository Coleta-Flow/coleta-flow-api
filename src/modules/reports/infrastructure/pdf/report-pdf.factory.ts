import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import type { EfficiencyReport, SummaryReport, SustainabilityReport } from '../../reports.types';

type ReportPdfInput = {
  periodLabel: string;
  generatedAt: Date;
  summary: SummaryReport;
  efficiency: EfficiencyReport;
  sustainability: SustainabilityReport;
};

@Injectable()
export class ReportPdfFactory {
  constructor(private readonly prisma: PrismaService) {}

  async generate(input: ReportPdfInput): Promise<Buffer> {
    const settings = await this.prisma.companySetting.findFirst();
    const companyName = settings?.companyName ?? 'EcoLogi';
    const primaryColor = settings?.primaryColor ?? '#10B981';

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 48, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).font('Helvetica-Bold').fillColor(primaryColor).text(companyName);
      doc.moveDown(0.3);
      doc.fontSize(14).fillColor('#111827').text('Relatório Operacional');
      doc.fontSize(10).font('Helvetica').fillColor('#6B7280');
      doc.text(`Período: ${input.periodLabel}`);
      doc.text(`Gerado em: ${input.generatedAt.toLocaleString('pt-BR')}`);

      this.section(doc, 'Indicadores gerais');
      const totalKg = input.sustainability.totalWeightCollectedKg;
      const totalCo2 = input.sustainability.totalCo2AvoidedKg;
      this.metricRow(doc, 'Peso coletado', `${totalKg.toLocaleString('pt-BR')} kg`);
      this.metricRow(doc, 'CO₂ evitado', `${totalCo2.toLocaleString('pt-BR')} kg`);
      this.metricRow(doc, 'Rotas finalizadas', String(input.efficiency.summary.totalFinishedRoutes));
      this.metricRow(doc, 'Distância percorrida', `${input.efficiency.summary.totalDistanceKm.toLocaleString('pt-BR')} km`);
      this.metricRow(doc, 'Horas operacionais', `${input.efficiency.summary.totalHours.toLocaleString('pt-BR')} h`);

      this.table(
        doc,
        'Volume por material',
        ['Material', 'Peso (kg)', 'Coletas'],
        input.summary.byType.map((row) => [
          row.materialTypeName,
          row.totalKg.toFixed(1),
          String(row.count),
        ]),
      );

      this.table(
        doc,
        'Volume por região',
        ['Cidade', 'Peso (kg)', 'Coletas'],
        input.summary.byRegion.slice(0, 10).map((row) => [
          row.city,
          row.totalKg.toFixed(1),
          String(row.count),
        ]),
      );

      this.table(
        doc,
        'Produtividade por motorista',
        ['Motorista', 'Rotas', 'Horas', 'Distância (km)', 'Peso (kg)'],
        input.efficiency.byDriver.slice(0, 10).map((row) => [
          row.driverName,
          String(row.totalRoutes),
          row.totalHours.toFixed(1),
          row.totalDistanceKm.toFixed(0),
          row.totalWeightKg.toFixed(0),
        ]),
      );

      this.table(
        doc,
        'Sustentabilidade por material',
        ['Material', 'Peso (kg)', 'CO₂ evitado (kg)'],
        input.sustainability.byMaterial.slice(0, 10).map((row) => [
          row.material,
          row.weightKg.toFixed(1),
          row.co2SavedKg.toFixed(1),
        ]),
      );

      doc
        .fontSize(8)
        .fillColor('#9CA3AF')
        .text(
          'Estimativa de CO₂ com base em fatores médios de reciclagem por tipo de material.',
          48,
          doc.page.height - 48,
          { align: 'center', width: doc.page.width - 96 },
        );

      doc.end();
    });
  }

  private section(doc: PDFKit.PDFDocument, title: string) {
    doc.moveDown(1);
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827').text(title);
    doc.moveDown(0.4);
  }

  private metricRow(doc: PDFKit.PDFDocument, label: string, value: string) {
    doc.fontSize(10).font('Helvetica').fillColor('#374151').text(`${label}: `, { continued: true });
    doc.font('Helvetica-Bold').fillColor('#111827').text(value);
  }

  private table(
    doc: PDFKit.PDFDocument,
    title: string,
    headers: string[],
    rows: string[][],
  ) {
    if (!rows.length) return;

    this.section(doc, title);

    const startX = doc.page.margins.left;
    const tableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colWidth = tableWidth / headers.length;
    let y = doc.y;

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#374151');
    headers.forEach((header, index) => {
      doc.text(header, startX + index * colWidth, y, { width: colWidth - 4 });
    });
    y += 16;

    doc.font('Helvetica').fillColor('#111827');
    for (const row of rows) {
      if (y > doc.page.height - 72) {
        doc.addPage();
        y = doc.page.margins.top;
      }
      row.forEach((cell, index) => {
        doc.text(cell, startX + index * colWidth, y, { width: colWidth - 4 });
      });
      y += 14;
    }

    doc.y = y + 4;
  }
}
