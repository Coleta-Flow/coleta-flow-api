import { Controller, Get, Post, Body, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CollectionPointsService } from './collection-points.service';

@ApiTags('Collection Points')
@ApiBearerAuth()
@Controller('collection-points')
export class CollectionPointsController {
  constructor(private readonly service: CollectionPointsService) {}

  @Get()
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'List collection points' })
  @ApiQuery({ name: 'city', required: false })
  findAll(@Query('city') city?: string) {
    return this.service.findAll(city);
  }

  @Get(':id')
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get collection point by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new collection point' })
  create(
    @Body() body: { name: string; address: string; city: string; lat: number; lng: number; phone?: string; operatingHours?: string },
  ) {
    return this.service.create(body);
  }
}
