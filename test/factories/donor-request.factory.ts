import { DonorRequestStatus } from '@prisma/client';

export function makeDonorRequest(overrides: Partial<{
  id: string;
  tenantId: string;
  status: DonorRequestStatus;
  donorName: string;
  city: string;
}> = {}) {
  return {
    id: overrides.id ?? 'request-uuid',
    tenantId: overrides.tenantId ?? 'tenant-uuid',
    trackingCode: 'CF-TEST01',
    status: overrides.status ?? DonorRequestStatus.REQUESTED,
    donorName: overrides.donorName ?? 'Solicitante Teste',
    donorWhatsapp: '(85) 99999-0000',
    donorEmail: 'teste@email.com',
    address: 'Rua das Flores, 123',
    city: overrides.city ?? 'Fortaleza',
    materialTypeId: 'material-type-uuid',
    description: 'Materiais para coleta e reciclagem',
    estimatedWeightKg: null,
    bestTimeForPickup: 'Tarde',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
