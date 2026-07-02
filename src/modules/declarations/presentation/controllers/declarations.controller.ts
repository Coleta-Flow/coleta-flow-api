import { Controller, Post, Get, Param, Body, Request, ParseUUIDPipe, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { UserRole } from '@prisma/client';
import { CommandBus } from '@nestjs/cqrs';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { Public } from '../../../../common/decorators/public.decorator';
import { GenerateDeclarationCommand } from '../../application/commands/generate-declaration.command';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@ApiTags('Declarations')
@Controller()
export class DeclarationsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly prisma: PrismaService,
  ) {}

  @Post('declarations/generate')
  @ApiBearerAuth()
  @Roles(UserRole.OPERATOR, UserRole.ADMIN, UserRole.COLLECTION_POINT_OPERATOR)
  @ApiOperation({ summary: 'Generate declaration PDF (requires weight record)' })
  @ApiResponse({ status: 201, description: 'Declaration generated' })
  @ApiResponse({ status: 422, description: 'WEIGHT_REQUIRED — no weight record found' })
  @ApiResponse({
    status: 422,
    description: 'DECLARATION_NOT_APPLICABLE — direct-to-point flow does not generate declarations',
  })
  generate(@Body() body: { donorRequestId: string }, @Request() req: any) {
    return this.commandBus.execute(
      new GenerateDeclarationCommand(body.donorRequestId, req.user.id),
    );
  }

  @Get('declarations')
  @ApiBearerAuth()
  @Roles(UserRole.OPERATOR, UserRole.ADMIN, UserRole.COLLECTION_POINT_OPERATOR)
  @ApiOperation({ summary: 'List declarations' })
  list() {
    return this.prisma.declaration.findMany({
      include: { donorRequest: true, weightRecord: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('declarations/:id')
  @ApiBearerAuth()
  @Roles(UserRole.OPERATOR, UserRole.ADMIN, UserRole.COLLECTION_POINT_OPERATOR)
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.prisma.declaration.findFirst({
      where: { id },
      include: { donorRequest: true, weightRecord: true },
    });
  }

  @Get('declarations/:id/download')
  @ApiBearerAuth()
  @Roles(UserRole.OPERATOR, UserRole.ADMIN, UserRole.COLLECTION_POINT_OPERATOR)
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOperation({ summary: 'Download declaration PDF' })
  async download(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const declaration = await this.prisma.declaration.findFirst({
      where: { id },
    });
    if (!declaration || !declaration.pdfUrl) {
      return res.status(404).json({ message: 'PDF não encontrado.' });
    }

    const filePath = path.join(process.cwd(), declaration.pdfUrl);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Arquivo não encontrado.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${declaration.code}.pdf"`);
    fs.createReadStream(filePath).pipe(res);
  }

  @Public()
  @Get('public/verify/:token')
  @ApiTags('Public')
  @ApiOperation({ summary: 'Verify declaration authenticity by validation token' })
  verifyByToken(@Param('token') token: string) {
    return this.prisma.declaration.findUnique({
      where: { validationToken: token },
      include: {
        donorRequest: { include: { materialType: true } },
        weightRecord: true,
      },
    });
  }
}
