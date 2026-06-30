import { Test, TestingModule } from '@nestjs/testing';
import { DonorRequestStatus } from '@prisma/client';
import { ApproveForPickupHandler } from './approve-for-pickup.handler';
import { ApproveForPickupCommand } from '../commands/approve-for-pickup.command';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { EventStoreService } from '../../../event-store/event-store.service';
import { InvalidStatusTransitionError } from '../../../../common/errors/domain.errors';

const mockPrisma = {
  donorRequest: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const mockEventStore = { save: jest.fn() };

describe('ApproveForPickupHandler', () => {
  let handler: ApproveForPickupHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApproveForPickupHandler,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventStoreService, useValue: mockEventStore },
      ],
    }).compile();

    handler = module.get<ApproveForPickupHandler>(ApproveForPickupHandler);
    jest.clearAllMocks();
  });

  it('should approve request when in UNDER_REVIEW status', async () => {
    mockPrisma.donorRequest.findUnique.mockResolvedValue({
      id: 'req-id',
      status: DonorRequestStatus.UNDER_REVIEW,
    });
    mockPrisma.donorRequest.update.mockResolvedValue({
      id: 'req-id',
      status: DonorRequestStatus.APPROVED_FOR_PICKUP,
    });
    mockEventStore.save.mockResolvedValue(undefined);

    const command = new ApproveForPickupCommand('req-id', 'operator-id');
    const result = await handler.execute(command);

    expect(result.status).toBe(DonorRequestStatus.APPROVED_FOR_PICKUP);
  });

  it('should throw InvalidStatusTransitionError when status is not UNDER_REVIEW', async () => {
    mockPrisma.donorRequest.findUnique.mockResolvedValue({
      id: 'req-id',
      status: DonorRequestStatus.REQUESTED,
    });

    const command = new ApproveForPickupCommand('req-id', 'op-id');
    await expect(handler.execute(command)).rejects.toThrow(InvalidStatusTransitionError);
  });
});
