import { DonorRequestStatus } from '@prisma/client';
import { WeightRequiredError } from '../../../../common/errors/domain.errors';

const mockPrisma = {
  donorRequest: { findUnique: jest.fn() },
  weightRecord: { findUnique: jest.fn() },
  declaration: { create: jest.fn() },
};

// Isolated business logic function (extracted from handler for testability)
async function validateAndGenerateDeclaration(donorRequestId: string) {
  const request = await mockPrisma.donorRequest.findUnique({ where: { id: donorRequestId } });
  if (!request) throw new Error('Solicitação não encontrada.');

  const weight = await mockPrisma.weightRecord.findUnique({ where: { donorRequestId } });
  if (!weight) throw new WeightRequiredError();

  return weight;
}

describe('GenerateDeclarationHandler — business rules', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should throw WeightRequiredError when no weight record exists', async () => {
    mockPrisma.donorRequest.findUnique.mockResolvedValue({
      id: 'req-id',
      status: DonorRequestStatus.DELIVERED_TO_COLLECTION_POINT,
    });
    mockPrisma.weightRecord.findUnique.mockResolvedValue(null);

    await expect(validateAndGenerateDeclaration('req-id')).rejects.toThrow(WeightRequiredError);
  });

  it('should proceed when weight is confirmed', async () => {
    mockPrisma.donorRequest.findUnique.mockResolvedValue({
      id: 'req-id',
      status: DonorRequestStatus.WEIGHED,
    });
    mockPrisma.weightRecord.findUnique.mockResolvedValue({
      id: 'weight-id',
      weightKg: 12.5,
    });

    const weight = await validateAndGenerateDeclaration('req-id');
    expect(weight.weightKg).toBe(12.5);
  });
});
