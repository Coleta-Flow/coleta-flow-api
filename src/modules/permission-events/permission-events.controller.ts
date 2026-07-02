import { Controller, Get, Post, Body, Query, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UserRole, PermissionType, PermissionEventStatus } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { PermissionEventsService } from './permission-events.service';
import { CreatePermissionEventDto } from './dto/create-permission-event.dto';

@ApiTags('Permission Events')
@ApiBearerAuth()
@Controller('permission-events')
export class PermissionEventsController {
  constructor(private readonly service: PermissionEventsService) {}

  @Post()
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Report a location permission event (granted/denied/revoked)' })
  create(@Body() dto: CreatePermissionEventDto, @Request() req: any) {
    return this.service.create(req.user.id, dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: 'List location permission events (audit log)' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'permissionType', required: false, enum: PermissionType })
  @ApiQuery({ name: 'status', required: false, enum: PermissionEventStatus })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query('userId') userId?: string,
    @Query('permissionType') permissionType?: PermissionType,
    @Query('status') status?: PermissionEventStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll({
      userId,
      permissionType,
      status,
      startDate,
      endDate,
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    });
  }
}
