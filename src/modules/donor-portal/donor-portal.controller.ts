import { Controller, Get, Post, Body, Param, ParseUUIDPipe, Query, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { DonorPortalService } from './donor-portal.service';
import { CreateDonorPortalRequestDto } from './dto/create-donor-portal-request.dto';

@ApiTags('Donor Portal')
@ApiBearerAuth()
@Controller('donor')
@Roles(UserRole.DONOR)
export class DonorPortalController {
  constructor(private readonly donorPortalService: DonorPortalService) {}

  @Get('me')
  @ApiOperation({ summary: 'Perfil do doador logado com resumo de doações' })
  me(@Request() req: any) {
    return this.donorPortalService.getMe(req.user.id, req.user.email);
  }

  @Get('requests')
  @ApiOperation({ summary: 'Listar solicitações do doador logado' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  listRequests(@Request() req: any, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.donorPortalService.listRequests(
      req.user.id,
      req.user.email,
      page ? +page : 1,
      limit ? +limit : 20,
    );
  }

  @Get('requests/:id')
  @ApiOperation({ summary: 'Detalhe de uma solicitação do doador logado' })
  getRequest(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.donorPortalService.getRequest(req.user.id, req.user.email, id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Histórico completo de coletas e peso doado' })
  history(@Request() req: any) {
    return this.donorPortalService.getHistory(req.user.id, req.user.email);
  }

  @Post('requests')
  @ApiOperation({ summary: 'Criar nova solicitação de coleta (doador logado)' })
  createRequest(@Request() req: any, @Body() dto: CreateDonorPortalRequestDto) {
    return this.donorPortalService.createRequest(req.user.id, req.user.email, dto);
  }
}
