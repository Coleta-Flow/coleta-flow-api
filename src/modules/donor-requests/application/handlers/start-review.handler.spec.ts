import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DonorRequestStatus } from '@prisma/client';
import { StartReviewHandler } from './start-review.handler';
import { StartReviewCommand } from '../commands/start-review.command';
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

describe('StartReviewHandler', () => {
  let handler: StartReviewHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StartReviewHandler,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventStoreService, useValue: mockEventStore },
      ],
    }).compile();

    handler = module.get<StartReviewHandler>(StartReviewHandler);
    jest.clearAllMocks();
  });

  it('should move request from REQUESTED to UNDER_REVIEW', async () => {
    mockPrisma.donorRequest.findUnique.mockResolvedValue({
      id: 'req-id',
      status: DonorRequestStatus.REQUESTED,
    });
    mockPrisma.donorRequest.update.mockResolvedValue({
      id: 'req-id',
      status: DonorRequestStatus.UNDER_REVIEW,
    });
    mockEventStore.save.mockResolvedValue(undefined);

    const result = await handler.execute(new StartReviewCommand('req-id', 'operator-id'));

    expect(result.status).toBe(DonorRequestStatus.UNDER_REVIEW);
    expect(mockEventStore.save).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'DonorRequest',
        entityId: 'req-id',
      }),
    );
  });

  it('should throw NotFoundException when request does not exist', async () => {
    mockPrisma.donorRequest.findUnique.mockResolvedValue(null);

    await expect(handler.execute(new StartReviewCommand('missing', 'op-id'))).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw InvalidStatusTransitionError when status is not REQUESTED', async () => {
    mockPrisma.donorRequest.findUnique.mockResolvedValue({
      id: 'req-id',
      status: DonorRequestStatus.APPROVED_FOR_PICKUP,
    });

    await expect(handler.execute(new StartReviewCommand('req-id', 'op-id'))).rejects.toThrow(
      InvalidStatusTransitionError,
    );
  });
});
