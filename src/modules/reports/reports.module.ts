import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportPdfFactory } from './infrastructure/pdf/report-pdf.factory';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, ReportPdfFactory],
})
export class ReportsModule {}
