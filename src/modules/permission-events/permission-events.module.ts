import { Module } from '@nestjs/common';
import { PermissionEventsController } from './permission-events.controller';
import { PermissionEventsService } from './permission-events.service';
import { PrismaModule } from '../../database/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PermissionEventsController],
  providers: [PermissionEventsService],
})
export class PermissionEventsModule {}
