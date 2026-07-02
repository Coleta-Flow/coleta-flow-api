import { Controller, Post, Body, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole, BusinessEventType } from '@prisma/client';
import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { EventStoreService } from '../../../event-store/event-store.service';

class TrackingSessionDto {
  @ApiProperty({ enum: ['STARTED', 'STOPPED'] })
  @IsIn(['STARTED', 'STOPPED'])
  status: 'STARTED' | 'STOPPED';
}

@ApiTags('Tracking')
@ApiBearerAuth()
@Controller('tracking/session')
export class TrackingSessionController {
  constructor(private readonly eventStore: EventStoreService) {}

  @Post()
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Report driver going on/off duty (starts or stops live tracking)' })
  async report(@Body() dto: TrackingSessionDto, @Request() req: any) {
    await this.eventStore.save({
      entityType: 'User',
      entityId: req.user.id,
      type:
        dto.status === 'STARTED'
          ? BusinessEventType.TRACKING_SESSION_STARTED
          : BusinessEventType.TRACKING_SESSION_STOPPED,
      payload: { userId: req.user.id },
    });
    return { message: 'Sessão de rastreamento registrada.' };
  }
}
