export const mockPrismaService = {
  $transaction: jest.fn(),
  tenant: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
  user: { findMany: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
  donorRequest: {
    findMany: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(),
    create: jest.fn(), update: jest.fn(), count: jest.fn(), groupBy: jest.fn(),
  },
  donorRequestPhoto: { createMany: jest.fn() },
  collectionPoint: {
    findMany: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(),
  },
  route: {
    findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(),
    update: jest.fn(), count: jest.fn(),
  },
  trackingSession: { create: jest.fn(), findFirst: jest.fn() },
  weightRecord: {
    findUnique: jest.fn(), create: jest.fn(),
    aggregate: jest.fn().mockResolvedValue({ _sum: { weightKg: 0 } }),
  },
  declaration: { create: jest.fn(), findUnique: jest.fn(), count: jest.fn() },
  pickupDecision: { create: jest.fn() },
  businessEvent: { create: jest.fn(), findMany: jest.fn() },
};
