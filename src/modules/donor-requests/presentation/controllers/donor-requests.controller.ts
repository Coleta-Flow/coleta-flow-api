import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
  Request,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UserRole } from '@prisma/client';
import { Public } from '../../../../common/decorators/public.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { CreateDonorRequestDto } from '../dtos/create-donor-request.dto';
import { CreateDonorRequestCommand } from '../../application/commands/create-donor-request.command';
import { ApproveForPickupCommand } from '../../application/commands/approve-for-pickup.command';
import { DirectToCollectionPointCommand } from '../../application/commands/direct-to-point.command';
import { ListDonorRequestsQuery } from '../../application/queries/list-donor-requests.query';
import { GetDonorRequestDetailsQuery } from '../../application/queries/get-donor-request-details.query';

@ApiTags('Donor Requests')
@Controller()
export class DonorRequestsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Public()
  @Post('public/donor-requests')
  @ApiTags('Public')
  @ApiOperation({ summary: 'Create a new collection request (no login required)' })
  @ApiResponse({ status: 201, description: 'Request created successfully' })
  createPublic(@Body() dto: CreateDonorRequestDto) {
    return this.commandBus.execute(
      new CreateDonorRequestCommand(
        dto.name,
        dto.whatsapp,
        dto.email,
        dto.address,
        dto.city,
        dto.materialTypeId,
        dto.description,
        dto.estimatedWeightKg,
        dto.bestTimeForPickup,
        [],
      ),
    );
  }

  @Get('donor-requests')
  @ApiBearerAuth()
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'List donor requests' })
  @ApiResponse({ status: 200, description: 'Paginated list of donor requests' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  list(@Query() query: any) {
    return this.queryBus.execute(
      new ListDonorRequestsQuery(
        query.status,
        query.city,
        +query.page || 1,
        +query.limit || 20,
      ),
    );
  }

  @Get('donor-requests/:id')
  @ApiBearerAuth()
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get donor request details' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.queryBus.execute(new GetDonorRequestDetailsQuery(id));
  }

  @Patch('donor-requests/:id/approve-pickup')
  @ApiBearerAuth()
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Approve request for pickup by driver' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Request approved for pickup' })
  @ApiResponse({ status: 422, description: 'INVALID_STATUS_TRANSITION' })
  approvePickup(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.commandBus.execute(
      new ApproveForPickupCommand(id, req.user.id),
    );
  }

  @Patch('donor-requests/:id/direct-to-point')
  @ApiBearerAuth()
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Direct request to a registered collection point' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  directToPoint(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { collectionPointId: string; notes?: string },
    @Request() req: any,
  ) {
    return this.commandBus.execute(
      new DirectToCollectionPointCommand(
        id,
        body.collectionPointId,
        req.user.id,
        body.notes,
      ),
    );
  }
}
