import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { RoutesController } from './presentation/controllers/routes.controller';
import { RoutesService } from './routes.service';
import { TrackingModule } from '../tracking/tracking.module';
import { EventStoreModule } from '../event-store/event-store.module';

@Module({
  imports: [CqrsModule, TrackingModule, EventStoreModule],
  controllers: [RoutesController],
  providers: [RoutesService],
  exports: [RoutesService],
})
export class RoutesModule {}
