import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DonorRequestsController } from './presentation/controllers/donor-requests.controller';
import { CreateDonorRequestHandler } from './application/handlers/create-donor-request.handler';
import { UpdateDonorRequestHandler } from './application/handlers/update-donor-request.handler';
import { CancelDonorRequestHandler } from './application/handlers/cancel-donor-request.handler';
import { ApproveForPickupHandler } from './application/handlers/approve-for-pickup.handler';
import { DirectToCollectionPointHandler } from './application/handlers/direct-to-point.handler';
import { ListDonorRequestsHandler } from './application/handlers/list-donor-requests.handler';
import { GetDonorRequestDetailsHandler } from './application/handlers/get-donor-request-details.handler';
import { EventStoreModule } from '../event-store/event-store.module';
import { PrismaModule } from '../../database/prisma/prisma.module';

const commandHandlers = [
  CreateDonorRequestHandler,
  UpdateDonorRequestHandler,
  CancelDonorRequestHandler,
  ApproveForPickupHandler,
  DirectToCollectionPointHandler,
];

const queryHandlers = [ListDonorRequestsHandler, GetDonorRequestDetailsHandler];

@Module({
  imports: [CqrsModule, EventStoreModule, PrismaModule],
  controllers: [DonorRequestsController],
  providers: [...commandHandlers, ...queryHandlers],
})
export class DonorRequestsModule {}
