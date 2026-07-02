import { Module } from '@nestjs/common';
import { PermissionEventsController } from './permission-events.controller';
import { PermissionEventsService } from './permission-events.service';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { TrackingModule } from '../tracking/tracking.module';

@Module({
  imports: [PrismaModule, TrackingModule],
  controllers: [PermissionEventsController],
  providers: [PermissionEventsService],
})
export class PermissionEventsModule {}
