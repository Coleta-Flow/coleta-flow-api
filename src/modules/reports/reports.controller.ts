import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Get dashboard metrics' })
  getDashboard() {
    return this.reportsService.getDashboard();
  }
}
