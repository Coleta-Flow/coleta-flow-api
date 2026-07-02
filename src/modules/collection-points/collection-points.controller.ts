import { Controller, Get, Post, Body, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
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
  @ApiResponse({ status: 200, description: 'List of collection points' })
  findAll(@Query('city') city?: string) {
    return this.service.findAll(city);
  }

  @Get(':id')
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get collection point by ID' })
  @ApiResponse({ status: 200, description: 'Collection point details' })
  @ApiResponse({ status: 404, description: 'Collection point not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new collection point' })
  @ApiResponse({ status: 201, description: 'Collection point created' })
  create(
    @Body()
    body: {
      name: string;
      address: string;
      city: string;
      lat: number;
      lng: number;
      phone?: string;
      operatingHours?: string;
    },
  ) {
    return this.service.create(body);
  }
}
