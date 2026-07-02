import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { CreateDonorRequestHandler } from './create-donor-request.handler';
import { CreateDonorRequestCommand } from '../commands/create-donor-request.command';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { EventStoreService } from '../../../event-store/event-store.service';
import { AuthService } from '../../../auth/auth.service';

const mockPrisma = {
  $transaction: jest.fn(),
  user: { findFirst: jest.fn() },
  role: { findUnique: jest.fn() },
  donor: { findFirst: jest.fn(), create: jest.fn() },
  donorRequest: { create: jest.fn() },
  donorRequestPhoto: { createMany: jest.fn() },
  fileAsset: { findMany: jest.fn() },
};

const mockEventStore = {
  save: jest.fn(),
};

const mockAuthService = {
  issueTokensForUser: jest.fn().mockResolvedValue({
    accessToken: 'fake-access-token',
    refreshToken: 'fake-refresh-token',
  }),
};

function buildCommand(
  overrides: Partial<{
    donorName: string;
    donorWhatsapp: string;
    donorEmail: string;
    password: string;
    cpfCnpj: string | undefined;
    cep: string | undefined;
    street: string;
    number: string;
    complement: string | undefined;
    neighborhood: string | undefined;
    city: string;
    state: string | undefined;
    materialTypeId: string;
    description: string;
    estimatedWeightKg: number | undefined;
    bestTimeForPickup: string;
    photoIds: string[];
  }> = {},
) {
  return new CreateDonorRequestCommand(
    overrides.donorName ?? 'João Silva',
    overrides.donorWhatsapp ?? '(85) 99999-0000',
    overrides.donorEmail ?? 'joao@email.com',
    overrides.password ?? 'secure123',
    overrides.cpfCnpj,
    overrides.cep ?? '60175-000',
    overrides.street ?? 'Rua das Flores',
    overrides.number ?? '123',
    overrides.complement,
    overrides.neighborhood ?? 'Centro',
    overrides.city ?? 'Fortaleza',
    overrides.state ?? 'CE',
    overrides.materialTypeId ?? 'material-type-uuid',
    overrides.description ?? 'Caixas de papelão e garrafas PET',
    overrides.estimatedWeightKg ?? 10,
    overrides.bestTimeForPickup ?? 'Tarde',
    overrides.photoIds ?? [],
  );
}

describe('CreateDonorRequestHandler', () => {
  let handler: CreateDonorRequestHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateDonorRequestHandler,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventStoreService, useValue: mockEventStore },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    handler = module.get<CreateDonorRequestHandler>(CreateDonorRequestHandler);
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.role.findUnique.mockResolvedValue({ id: 'role-donor', name: UserRole.DONOR });
  });

  afterEach(() => jest.clearAllMocks());

  it('should create donor, user, request and return tokens', async () => {
    const createdRequest = { id: 'req-uuid', trackingCode: 'CF-ABC123' };

    const mockTx = {
      donor: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'donor-1' }),
        update: jest.fn().mockResolvedValue({ id: 'donor-1', userId: 'user-1' }),
      },
      user: {
        create: jest.fn().mockResolvedValue({ id: 'user-1' }),
      },
      donorRequest: { create: jest.fn() },
      donorRequestPhoto: { createMany: jest.fn() },
      fileAsset: { findMany: jest.fn() },
    };
    mockPrisma.$transaction.mockImplementation(
      async (fn: (tx: typeof mockTx) => Promise<unknown>) => {
        mockTx.donorRequest.create.mockResolvedValue(createdRequest);
        return fn(mockTx);
      },
    );
    mockEventStore.save.mockResolvedValue(undefined);

    const result = await handler.execute(buildCommand());

    expect(result).toHaveProperty('trackingCode');
    expect(result).toHaveProperty('id');
    expect(result.message).toBe('Solicitação criada com sucesso.');
    expect(result.accessToken).toBe('fake-access-token');
    expect(result.refreshToken).toBe('fake-refresh-token');
    expect(mockAuthService.issueTokensForUser).toHaveBeenCalledWith('user-1');
    expect(mockEventStore.save).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'DonorRequest' }),
    );
  });

  it('should create a donor request with optional fields omitted', async () => {
    const createdRequest = { id: 'req-uuid', trackingCode: 'CF-XYZ' };

    const mockTx = {
      donor: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'donor-1' }),
        update: jest.fn().mockResolvedValue({ id: 'donor-1', userId: 'user-1' }),
      },
      user: {
        create: jest.fn().mockResolvedValue({ id: 'user-1' }),
      },
      donorRequest: { create: jest.fn() },
      donorRequestPhoto: { createMany: jest.fn() },
      fileAsset: { findMany: jest.fn() },
    };
    mockPrisma.$transaction.mockImplementation(
      async (fn: (tx: typeof mockTx) => Promise<unknown>) => {
        mockTx.donorRequest.create.mockResolvedValue(createdRequest);
        return fn(mockTx);
      },
    );
    mockEventStore.save.mockResolvedValue(undefined);

    const result = await handler.execute(
      buildCommand({
        donorName: 'Ana',
        donorWhatsapp: '(11) 91111-2222',
        donorEmail: 'ana@email.com',
        street: 'Av. Paulista',
        number: '1',
        city: 'São Paulo',
        state: 'SP',
        materialTypeId: 'mat-uuid',
        description: 'Eletrônicos',
        estimatedWeightKg: undefined,
        bestTimeForPickup: 'Manhã',
        cep: undefined,
        neighborhood: undefined,
      }),
    );

    expect(result).toHaveProperty('trackingCode');
  });

  it('should create photos when photoIds are provided', async () => {
    const createdRequest = { id: 'req-uuid', trackingCode: 'CF-PH1' };
    const photoIds = ['fa-1', 'fa-2'];
    const createManyPhotos = jest.fn().mockResolvedValue({ count: 2 });

    const mockTx = {
      donor: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'donor-1' }),
        update: jest.fn().mockResolvedValue({ id: 'donor-1', userId: 'user-1' }),
      },
      user: {
        create: jest.fn().mockResolvedValue({ id: 'user-1' }),
      },
      donorRequest: { create: jest.fn() },
      donorRequestPhoto: { createMany: createManyPhotos },
      fileAsset: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'fa-1',
            url: 'http://storage/photo1.jpg',
            filename: 'photo1.jpg',
            sizeBytes: null,
            mimeType: null,
          },
          {
            id: 'fa-2',
            url: 'http://storage/photo2.jpg',
            filename: 'photo2.jpg',
            sizeBytes: null,
            mimeType: null,
          },
        ]),
      },
    };
    mockPrisma.$transaction.mockImplementation(
      async (fn: (tx: typeof mockTx) => Promise<unknown>) => {
        mockTx.donorRequest.create.mockResolvedValue(createdRequest);
        return fn(mockTx);
      },
    );
    mockEventStore.save.mockResolvedValue(undefined);

    await handler.execute(
      buildCommand({
        donorName: 'Pedro',
        donorWhatsapp: '(21) 98888-7777',
        donorEmail: 'pedro@email.com',
        street: 'Rua X',
        number: '10',
        city: 'Rio',
        state: 'RJ',
        materialTypeId: 'mat-id',
        description: 'Móveis',
        estimatedWeightKg: 50,
        bestTimeForPickup: 'Noite',
        photoIds,
      }),
    );

    expect(createManyPhotos).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ url: 'http://storage/photo1.jpg' }),
        ]),
      }),
    );
  });
});
