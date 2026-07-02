import { Test, TestingModule } from '@nestjs/testing';
import { CreateDonorRequestHandler } from './create-donor-request.handler';
import { CreateDonorRequestCommand } from '../commands/create-donor-request.command';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { EventStoreService } from '../../../event-store/event-store.service';

const mockPrisma = {
  $transaction: jest.fn(),
  donorRequest: { create: jest.fn() },
  donorRequestPhoto: { createMany: jest.fn() },
};

const mockEventStore = {
  save: jest.fn(),
};

describe('CreateDonorRequestHandler', () => {
  let handler: CreateDonorRequestHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateDonorRequestHandler,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventStoreService, useValue: mockEventStore },
      ],
    }).compile();

    handler = module.get<CreateDonorRequestHandler>(CreateDonorRequestHandler);
  });

  afterEach(() => jest.clearAllMocks());

  it('should create a donor request without login and return trackingCode', async () => {
    const createdRequest = { id: 'req-uuid', trackingCode: 'CF-ABC123' };

    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      mockPrisma.donorRequest.create.mockResolvedValue(createdRequest);
      return fn(mockPrisma);
    });
    mockEventStore.save.mockResolvedValue(undefined);

    const command = new CreateDonorRequestCommand(
      'João Silva',
      '(85) 99999-0000',
      undefined,
      'Rua das Flores, 123',
      'Fortaleza',
      'material-type-uuid',
      'Caixas de papelão e garrafas PET',
      10,
      'Tarde',
      [],
    );

    const result = await handler.execute(command);

    expect(result).toHaveProperty('trackingCode');
    expect(result).toHaveProperty('id');
    expect(result.message).toBe('Solicitação criada com sucesso.');
    expect(mockEventStore.save).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'DonorRequest' }),
    );
  });

  it('should create a donor request with all fields', async () => {
    const createdRequest = { id: 'req-uuid', trackingCode: 'CF-XYZ' };

    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      mockPrisma.donorRequest.create.mockResolvedValue(createdRequest);
      return fn(mockPrisma);
    });
    mockEventStore.save.mockResolvedValue(undefined);

    const command = new CreateDonorRequestCommand(
      'Ana',
      '(11) 91111-2222',
      undefined,
      'Av. Paulista, 1',
      'São Paulo',
      'mat-uuid',
      'Eletrônicos',
      undefined,
      'Manhã',
      [],
    );

    const result = await handler.execute(command);
    expect(result).toHaveProperty('trackingCode');
  });

  it('should create photos when photoUrls are provided', async () => {
    const createdRequest = { id: 'req-uuid', trackingCode: 'CF-PH1' };
    const photoUrls = ['http://storage/photo1.jpg', 'http://storage/photo2.jpg'];

    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      mockPrisma.donorRequest.create.mockResolvedValue(createdRequest);
      mockPrisma.donorRequestPhoto.createMany.mockResolvedValue({ count: 2 });
      return fn(mockPrisma);
    });
    mockEventStore.save.mockResolvedValue(undefined);

    const command = new CreateDonorRequestCommand(
      'Pedro',
      '(21) 98888-7777',
      'pedro@email.com',
      'Rua X, 10',
      'Rio',
      'mat-id',
      'Móveis',
      50,
      'Noite',
      photoUrls,
    );

    await handler.execute(command);

    expect(mockPrisma.donorRequestPhoto.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([expect.objectContaining({ url: photoUrls[0] })]),
      }),
    );
  });
});
