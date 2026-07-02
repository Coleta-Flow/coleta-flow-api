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
  ApiQuery,
} from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UserRole } from '@prisma/client';
import { Public } from '../../../../common/decorators/public.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { CreateDonorRequestDto } from '../dtos/create-donor-request.dto';
import { UpdateDonorRequestDto } from '../dtos/update-donor-request.dto';
import { CancelDonorRequestDto } from '../dtos/cancel-donor-request.dto';
import { CreateDonorRequestCommand } from '../../application/commands/create-donor-request.command';
import { UpdateDonorRequestCommand } from '../../application/commands/update-donor-request.command';
import { CancelDonorRequestCommand } from '../../application/commands/cancel-donor-request.command';
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
        dto.photoIds ?? [],
      ),
    );
  }

  @Get('donor-requests')
  @ApiBearerAuth()
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'List donor requests with optional filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of donor requests' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'city', required: false, description: 'Filter by city (partial match)' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Filter by start date (ISO string)',
  })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter by end date (ISO string)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20)' })
  list(@Query() query: any) {
    return this.queryBus.execute(
      new ListDonorRequestsQuery(
        query.status,
        query.city,
        query.startDate,
        query.endDate,
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
    return this.commandBus.execute(new ApproveForPickupCommand(id, req.user.id));
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
      new DirectToCollectionPointCommand(id, body.collectionPointId, req.user.id, body.notes),
    );
  }

  @Patch('donor-requests/:id')
  @ApiBearerAuth()
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update donor request fields' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Request updated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDonorRequestDto) {
    return this.commandBus.execute(
      new UpdateDonorRequestCommand(
        id,
        dto.description,
        dto.estimatedWeightKg,
        dto.bestTimeForPickup,
        dto.operatorNotes,
      ),
    );
  }

  @Patch('donor-requests/:id/cancel')
  @ApiBearerAuth()
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Cancel a donor request' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Request cancelled' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Not found' })
  cancel(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CancelDonorRequestDto) {
    return this.commandBus.execute(new CancelDonorRequestCommand(id, dto.reason));
  }
}
