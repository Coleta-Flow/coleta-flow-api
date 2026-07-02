import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
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
  getDashboard(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.reportsService.getDashboard(startDate, endDate);
  }

  @Get('summary')
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get volume summary by type, region, and driver' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
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
  getEfficiency(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.reportsService.getEfficiency(startDate, endDate);
  }

  @Get('sustainability')
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get sustainability report (RF27): CO₂ avoided by recycling' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getSustainability(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.reportsService.getSustainability(startDate, endDate);
  }

  @Get('export')
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Export reports as CSV (RF30)' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'format', required: false, enum: ['csv'] })
  async export(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Res() res?: Response,
  ) {
    const csv = await this.reportsService.exportCsv(startDate, endDate);
    if (res) {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="relatorio.csv"');
      return res.send(csv);
    }
    return csv;
  }
}
