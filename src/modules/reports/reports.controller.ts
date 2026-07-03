import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get dashboard metrics with optional period filter' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Dashboard metrics' })
  getDashboard(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.reportsService.getDashboard(startDate, endDate);
  }

  @Get('overview')
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get consolidated KPIs for the reports page' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getOverview(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.reportsService.getOverview(startDate, endDate);
  }

  @Get('summary')
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get volume summary by type, region, and driver' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Volume summary' })
  getSummary(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.reportsService.getSummary(startDate, endDate);
  }

  @Get('efficiency')
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get operational efficiency report (RF26): km, hours, productivity by driver',
  })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Efficiency report' })
  getEfficiency(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.reportsService.getEfficiency(startDate, endDate);
  }

  @Get('sustainability')
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get sustainability report (RF27): CO₂ avoided by recycling' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Sustainability report' })
  getSustainability(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.reportsService.getSustainability(startDate, endDate);
  }

  @Get('export')
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Export reports as CSV or PDF (RF30)' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'pdf'] })
  @ApiResponse({ status: 200, description: 'Report file stream' })
  async export(
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('format') format: 'csv' | 'pdf' = 'csv',
  ) {
    if (format === 'pdf') {
      const pdf = await this.reportsService.exportPdf(startDate, endDate);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="relatorio-ecologi.pdf"');
      return res.send(pdf);
    }

    const csv = await this.reportsService.exportCsv(startDate, endDate);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="relatorio-ecologi.csv"');
    return res.send(csv);
  }
}
