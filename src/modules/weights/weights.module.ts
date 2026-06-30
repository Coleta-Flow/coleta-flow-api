import { Module } from '@nestjs/common';
import { WeightsController } from './weights.controller';
import { WeightsService } from './weights.service';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { EventStoreModule } from '../event-store/event-store.module';

@Module({
  imports: [PrismaModule, EventStoreModule],
  controllers: [WeightsController],
  providers: [WeightsService],
})
export class WeightsModule {}
