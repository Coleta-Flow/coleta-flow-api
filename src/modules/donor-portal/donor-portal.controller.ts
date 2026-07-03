import { Controller, Get, Post, Body, Param, ParseUUIDPipe, Query, Request, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { UserRole } from '@prisma/client';
import * as fs from 'fs';
import { Roles } from '../../common/decorators/roles.decorator';
import { DonorPortalService } from './donor-portal.service';
import { CreateDonorPortalRequestDto } from './dto/create-donor-portal-request.dto';
import { DeclarationFilesService } from '../declarations/declaration-files.service';

@ApiTags('Donor Portal')
@ApiBearerAuth()
@Controller('donor')
@Roles(UserRole.DONOR)
export class DonorPortalController {
  constructor(
    private readonly donorPortalService: DonorPortalService,
    private readonly declarationFiles: DeclarationFilesService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Perfil do doador logado com resumo de doações' })
  @ApiResponse({ status: 200, description: 'Perfil do doador' })
  me(@Request() req: any) {
    return this.donorPortalService.getMe(req.user.id, req.user.email);
  }

  @Get('requests')
  @ApiOperation({ summary: 'Listar solicitações do doador logado' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Lista paginada de solicitações' })
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
  @ApiResponse({ status: 200, description: 'Detalhe da solicitação' })
  @ApiResponse({ status: 404, description: 'Solicitação não encontrada' })
  getRequest(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.donorPortalService.getRequest(req.user.id, req.user.email, id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Histórico completo de coletas e peso doado' })
  @ApiResponse({ status: 200, description: 'Histórico de coletas' })
  history(@Request() req: any) {
    return this.donorPortalService.getHistory(req.user.id, req.user.email);
  }

  @Post('requests')
  @ApiOperation({ summary: 'Criar nova solicitação de coleta (doador logado)' })
  @ApiResponse({ status: 201, description: 'Solicitação criada' })
  createRequest(@Request() req: any, @Body() dto: CreateDonorPortalRequestDto) {
    return this.donorPortalService.createRequest(req.user.id, req.user.email, dto);
  }

  @Get('requests/:id/declaration/download')
  @ApiOperation({ summary: 'Download da declaração da solicitação do doador' })
  @ApiResponse({ status: 200, description: 'PDF da declaração' })
  async downloadDeclaration(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const declaration = await this.declarationFiles.getForDonorRequest(
      id,
      req.user.id,
      req.user.email,
    );
    const { filePath, filename } = this.declarationFiles.resolvePdfPath(declaration);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    fs.createReadStream(filePath).pipe(res);
  }
}
