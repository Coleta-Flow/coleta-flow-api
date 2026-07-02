import { PrismaClient, UserRole, DonorRequestStatus, RouteStatus, BusinessEventType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'node:crypto';

const prisma = new PrismaClient();

async function safeDeleteMany(label: string, action: () => Promise<unknown>) {
  try {
    await action();
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    if (code === 'P2021') {
      console.warn(`[seed] skipping ${label}: table not found`);
      return;
    }
    throw error;
  }
}

async function main() {
  const hash = await bcrypt.hash('123456', 10);

  // =========================================================================
  // Limpeza completa (ordem respeita FK)
  // =========================================================================
  await safeDeleteMany('businessEvent', () => prisma.businessEvent.deleteMany());
  await safeDeleteMany('declaration', () => prisma.declaration.deleteMany());
  await safeDeleteMany('weightRecord', () => prisma.weightRecord.deleteMany());
  await safeDeleteMany('driverLocationSnapshot', () => prisma.driverLocationSnapshot.deleteMany());
  await safeDeleteMany('trackingSession', () => prisma.trackingSession.deleteMany());
  await safeDeleteMany('routeStop', () => prisma.routeStop.deleteMany());
  await safeDeleteMany('route', () => prisma.route.deleteMany());
  await safeDeleteMany('pickupDecision', () => prisma.pickupDecision.deleteMany());
  await safeDeleteMany('donorRequestPhoto', () => prisma.donorRequestPhoto.deleteMany());
  await safeDeleteMany('donorRequest', () => prisma.donorRequest.deleteMany());
  await safeDeleteMany('donor', () => prisma.donor.deleteMany());
  await safeDeleteMany('collectionPoint', () => prisma.collectionPoint.deleteMany());
  await safeDeleteMany('materialType', () => prisma.materialType.deleteMany());
  await safeDeleteMany('driver', () => prisma.driver.deleteMany());
  await safeDeleteMany('vehicle', () => prisma.vehicle.deleteMany());
  await safeDeleteMany('refreshToken', () => prisma.refreshToken.deleteMany());
  await safeDeleteMany('user', () => prisma.user.deleteMany());
  await safeDeleteMany('fileAsset', () => prisma.fileAsset.deleteMany());
  await safeDeleteMany('role', () => prisma.role.deleteMany());

  // =========================================================================
  // Roles
  // =========================================================================

  const roleNames = [
    UserRole.ADMIN,
    UserRole.OPERATOR,
    UserRole.DRIVER,
    UserRole.COLLECTION_POINT_OPERATOR,
    UserRole.DONOR,
  ] as const;

  const roleMap = {} as Record<UserRole, string>;
  for (const name of roleNames) {
    const role = await prisma.role.create({ data: { name } });
    roleMap[name] = role.id;
  }

  // =========================================================================
  // Veículos
  // =========================================================================

  const vehicle1 = await prisma.vehicle.create({
    data: {
      plate: 'ABC-1234',
      brand: 'Fiat',
      model: 'Fiorino 2023',
      capacityKg: 650,
    },
  });

  const vehicle2 = await prisma.vehicle.create({
    data: {
      plate: 'XYZ-5678',
      brand: 'VW',
      model: 'Kombi 2022',
      capacityKg: 1200,
    },
  });

  const vehicle3 = await prisma.vehicle.create({
    data: {
      plate: 'DEF-9012',
      brand: 'Renault',
      model: 'Master 2021',
      capacityKg: 1500,
    },
  });

  // =========================================================================
  // Usuários
  // =========================================================================

  const admin = await prisma.user.upsert({
    where: { email: 'admin@ecologi.com.br' },
    update: { password: hash },
    create: {
      name: 'Administrador',
      email: 'admin@ecologi.com.br',
      password: hash,
      role: UserRole.ADMIN,
      roleId: roleMap[UserRole.ADMIN],
      phone: '(85) 98888-0001',
    },
  });

  const operator = await prisma.user.upsert({
    where: { email: 'operador@ecologi.com.br' },
    update: { password: hash },
    create: {
      name: 'Maria Oliveira',
      email: 'operador@ecologi.com.br',
      password: hash,
      role: UserRole.OPERATOR,
      roleId: roleMap[UserRole.OPERATOR],
      phone: '(85) 98888-0002',
    },
  });

  const driverUser = await prisma.user.upsert({
    where: { email: 'motorista@ecologi.com.br' },
    update: { password: hash },
    create: {
      name: 'João Silva',
      email: 'motorista@ecologi.com.br',
      password: hash,
      role: UserRole.DRIVER,
      roleId: roleMap[UserRole.DRIVER],
      phone: '(85) 98888-0003',
    },
  });

  await prisma.driver.upsert({
    where: { userId: driverUser.id },
    update: {
      licenseNumber: '12345678900',
      vehicleId: vehicle1.id,
      vehiclePlate: vehicle1.plate,
      vehicleModel: `${vehicle1.brand} ${vehicle1.model}`,
    },
    create: {
      userId: driverUser.id,
      licenseNumber: '12345678900',
      vehicleId: vehicle1.id,
      vehiclePlate: vehicle1.plate,
      vehicleModel: `${vehicle1.brand} ${vehicle1.model}`,
    },
  });

  const driverUser2 = await prisma.user.upsert({
    where: { email: 'motorista2@ecologi.com.br' },
    update: { password: hash },
    create: {
      name: 'Pedro Santos',
      email: 'motorista2@ecologi.com.br',
      password: hash,
      role: UserRole.DRIVER,
      roleId: roleMap[UserRole.DRIVER],
      phone: '(85) 98888-0004',
    },
  });

  await prisma.driver.upsert({
    where: { userId: driverUser2.id },
    update: {
      licenseNumber: '98765432100',
      vehicleId: vehicle2.id,
      vehiclePlate: vehicle2.plate,
      vehicleModel: `${vehicle2.brand} ${vehicle2.model}`,
    },
    create: {
      userId: driverUser2.id,
      licenseNumber: '98765432100',
      vehicleId: vehicle2.id,
      vehiclePlate: vehicle2.plate,
      vehicleModel: `${vehicle2.brand} ${vehicle2.model}`,
    },
  });

  const collectorUser = await prisma.user.upsert({
    where: { email: 'ponto@ecologi.com.br' },
    update: { password: hash },
    create: {
      name: 'Carlos Pereira',
      email: 'ponto@ecologi.com.br',
      password: hash,
      role: UserRole.COLLECTION_POINT_OPERATOR,
      roleId: roleMap[UserRole.COLLECTION_POINT_OPERATOR],
      phone: '(85) 98888-0005',
    },
  });

  // DONOR users (RF31)
  await prisma.user.upsert({
    where: { email: 'doador@ecologi.com.br' },
    update: { password: hash },
    create: {
      name: 'Ana Doadora',
      email: 'doador@ecologi.com.br',
      password: hash,
      role: UserRole.DONOR,
      roleId: roleMap[UserRole.DONOR],
      phone: '(85) 98888-0006',
    },
  });

  // =========================================================================
  // Tipos de material
  // =========================================================================

  const materialTypes = [
    { name: 'Papel e papelão', description: 'Jornais, revistas, caixas de papelão, folhas de papel', unitOfMeasure: 'kg' },
    { name: 'Plástico', description: 'Garrafas PET, embalagens plásticas, sacos', unitOfMeasure: 'kg' },
    { name: 'Vidro', description: 'Garrafas, potes, frascos de vidro', unitOfMeasure: 'kg' },
    { name: 'Metal', description: 'Latas de alumínio, ferragens, cobre', unitOfMeasure: 'kg' },
    { name: 'Eletrônicos', description: 'Computadores, celulares, pilhas, baterias', unitOfMeasure: 'un' },
    { name: 'Óleo de cozinha', description: 'Óleo vegetal usado', unitOfMeasure: 'l' },
    { name: 'Madeira', description: 'Móveis, pallets, sobras de madeira', unitOfMeasure: 'kg' },
    { name: 'Orgânico', description: 'Restos de alimentos, cascas, podas de jardinagem', unitOfMeasure: 'kg' },
  ];

  const materialTypeRecords: Record<string, string> = {};
  for (const mt of materialTypes) {
    const existing = await prisma.materialType.findFirst({ where: { name: mt.name } });
    const record = existing ?? await prisma.materialType.create({ data: { name: mt.name, description: mt.description } });
    materialTypeRecords[mt.name] = record.id;
  }

  // =========================================================================
  // Pontos de coleta
  // =========================================================================

  const collectionPoints = [
    {
      name: 'Ecoponto Centro',
      address: 'Rua Barão do Rio Branco, 500',
      city: 'Fortaleza',
      lat: -3.7219,
      lng: -38.5234,
      phone: '(85) 3221-1000',
      operatingHours: 'Seg–Sex 07h–18h | Sáb 08h–12h',
    },
    {
      name: 'Ecoponto Aldeota',
      address: 'Av. Santos Dumont, 1500',
      city: 'Fortaleza',
      lat: -3.7350,
      lng: -38.4930,
      phone: '(85) 3221-2000',
      operatingHours: 'Seg–Sex 07h–19h | Sáb 08h–14h',
    },
    {
      name: 'Ecoponto Parangaba',
      address: 'Av. João Pessoa, 4000',
      city: 'Fortaleza',
      lat: -3.7740,
      lng: -38.5470,
      phone: '(85) 3221-3000',
      operatingHours: 'Seg–Sex 08h–17h',
    },
    {
      name: 'Ecoponto Messejana',
      address: 'Av. Washington Soares, 8000',
      city: 'Fortaleza',
      lat: -3.7920,
      lng: -38.4630,
      phone: '(85) 3221-4000',
      operatingHours: 'Seg–Sáb 07h–17h',
    },
    {
      name: 'Ecoponto Caucaia',
      address: 'Av. Edson da Mota Correia, 200',
      city: 'Caucaia',
      lat: -3.7340,
      lng: -38.6580,
      phone: '(85) 3221-5000',
      operatingHours: 'Seg–Sex 07h–17h',
    },
  ];

  const pointRecords: Record<string, string> = {};
  for (const cp of collectionPoints) {
    const existing = await prisma.collectionPoint.findFirst({
      where: { name: cp.name, city: cp.city },
    });
    const record = existing ?? await prisma.collectionPoint.create({ data: cp });
    pointRecords[`${cp.name}/${cp.city}`] = record.id;
  }

  // =========================================================================
  // Doadores (Donor entity)
  // =========================================================================

  const donorsData = [
    { name: 'Ana Beatriz Costa', whatsapp: '(85) 98765-1001', address: 'Rua Joaquim Távora, 250', city: 'Fortaleza' },
    { name: 'Lucas Mendes', whatsapp: '(85) 98765-1002', address: 'Av. Beira Mar, 3500', city: 'Fortaleza' },
    { name: 'Fernanda Lima', whatsapp: '(85) 98765-1003', address: 'Rua Maria Tomásia, 800', city: 'Fortaleza' },
    { name: 'Roberto Almeida', whatsapp: '(85) 98765-1004', address: 'Rua Pereira Filgueiras, 150', city: 'Fortaleza' },
    { name: 'Juliana Castro', whatsapp: '(85) 98765-1005', address: 'Av. Dom Luís, 500', city: 'Fortaleza' },
    { name: 'Marcos Vinícius', whatsapp: '(85) 98765-1006', address: 'Rua Guilherme Rocha, 300', city: 'Fortaleza' },
    { name: 'Patrícia Gomes', whatsapp: '(85) 98765-1007', address: 'Rua Vicente Leite, 1500', city: 'Fortaleza' },
    { name: 'Thiago Barbosa', whatsapp: '(85) 98765-1008', address: 'Av. Antônio Sales, 600', city: 'Fortaleza' },
    { name: 'Camila Rocha', whatsapp: '(85) 98765-1009', address: 'Rua Torres Câmara, 100', city: 'Fortaleza' },
    { name: 'Gustavo Nunes', whatsapp: '(85) 98765-1010', address: 'Rua Pedro I, 400', city: 'Caucaia' },
    { name: 'Amanda Farias', whatsapp: '(85) 98765-1011', address: 'Rua Coronel Jucá, 200', city: 'Maracanaú' },
    { name: 'Daniel Oliveira', whatsapp: '(85) 98765-1012', address: 'Rua 13 de Maio, 700', city: 'Sobral' },
    { name: 'Beatriz Nascimento', whatsapp: '(85) 98765-1013', address: 'Rua Osvaldo Cruz, 120', city: 'Fortaleza' },
    { name: 'Ricardo Souza', whatsapp: '(85) 98765-1014', address: 'Av. Alberto Craveiro, 900', city: 'Fortaleza' },
    { name: 'Larissa Martins', whatsapp: '(85) 98765-1015', address: 'Rua Delmiro Gouveia, 45', city: 'Fortaleza' },
    { name: 'Felipe Carvalho', whatsapp: '(85) 98765-1016', address: 'Av. Pontes Vieira, 1800', city: 'Fortaleza' },
    { name: 'Isabela Freitas', whatsapp: '(85) 98765-1017', address: 'Rua Barbosa de Freitas, 320', city: 'Fortaleza' },
    { name: 'Bruno Cavalcante', whatsapp: '(85) 98765-1018', address: 'Av. Eng. Santana Júnior, 2100', city: 'Fortaleza' },
    { name: 'Carla Duarte', whatsapp: '(85) 98765-1019', address: 'Rua Prof. Sá Leitão, 88', city: 'Eusébio' },
    { name: 'Henrique Pinto', whatsapp: '(85) 98765-1020', address: 'Av. Contorno Leste, 550', city: 'Maracanaú' },
    { name: 'Vanessa Lopes', whatsapp: '(85) 98765-1021', address: 'Rua Dr. Atualpa, 670', city: 'Fortaleza' },
    { name: 'Diego Moura', whatsapp: '(85) 98765-1022', address: 'Av. Jovita Feitosa, 1400', city: 'Fortaleza' },
    { name: 'Renata Vieira', whatsapp: '(85) 98765-1023', address: 'Rua Sen. Pompeu, 230', city: 'Fortaleza' },
    { name: 'Paulo Henrique', whatsapp: '(85) 98765-1024', address: 'Av. I, 310', city: 'Caucaia' },
    { name: 'Mariana Teixeira', whatsapp: '(85) 98765-1025', address: 'Rua Major Facundo, 410', city: 'Sobral' },
    { name: 'Eduardo Ramos', whatsapp: '(85) 98765-1026', address: 'Av. Bezerra de Menezes, 2200', city: 'Fortaleza' },
    { name: 'Simone Araújo', whatsapp: '(85) 98765-1027', address: 'Rua Padre Valdevino, 980', city: 'Fortaleza' },
    { name: 'Leandro Brito', whatsapp: '(85) 98765-1028', address: 'Av. Aguanambi, 1650', city: 'Fortaleza' },
    { name: 'Tatiane Melo', whatsapp: '(85) 98765-1029', address: 'Rua Conselheiro Estelita, 75', city: 'Fortaleza' },
    { name: 'André Cunha', whatsapp: '(85) 98765-1030', address: 'Av. Central, 420', city: 'Maracanaú' },
  ];

  const donorRecords: Record<string, string> = {};
  for (const d of donorsData) {
    const existing = await prisma.donor.findFirst({
      where: { whatsapp: d.whatsapp, deletedAt: null },
    });
    const record = existing ?? await prisma.donor.create({
      data: { name: d.name, whatsapp: d.whatsapp, city: d.city, street: d.address },
    });
    donorRecords[d.name] = record.id;
  }

  // =========================================================================
  // Solicitações de coleta
  // =========================================================================

  async function createDonorRequest(
    donorName: string,
    donorWhatsapp: string,
    address: string,
    city: string,
    materialName: string,
    description: string,
    estimatedWeightKg: number,
    bestTimeForPickup: string,
    status: DonorRequestStatus,
    extra?: {
      operatorNotes?: string;
      cancelReason?: string;
      createdAt?: Date;
    },
  ) {
    const materialTypeId = materialTypeRecords[materialName];
    if (!materialTypeId) throw new Error(`Material type not found: ${materialName}`);

    const trackingCode = `COL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const donorId = donorRecords[donorName];
    const createdAt = extra?.createdAt ?? new Date();

    return prisma.donorRequest.create({
      data: {
        trackingCode,
        status,
        donorId,
        donorName,
        donorWhatsapp,
        address,
        city,
        materialTypeId,
        description,
        estimatedWeightKg,
        bestTimeForPickup,
        operatorNotes: extra?.operatorNotes,
        cancelReason: extra?.cancelReason,
        createdAt,
        updatedAt: createdAt,
      },
    });
  }

  const materialNames = materialTypes.map((m) => m.name);
  const descriptions = [
    'Material reciclável separado e embalado para coleta.',
    'Grande volume acumulado — necessita veículo com capacidade.',
    'Resíduos de reforma residencial, preferencialmente pela manhã.',
    'Coleta periódica de material de escritório.',
    'Garrafas e embalagens limpas, prontas para triagem.',
    'Sucata metálica de pequeno porte.',
    'Restos de poda e material orgânico seco.',
  ];
  const pickupTimes = ['Manhã (08h–12h)', 'Tarde (13h–17h)', 'Comercial (09h–18h)'];

  const statusDistribution: Array<{ status: DonorRequestStatus; count: number }> = [
    { status: DonorRequestStatus.REQUESTED, count: 24 },
    { status: DonorRequestStatus.UNDER_REVIEW, count: 18 },
    { status: DonorRequestStatus.APPROVED_FOR_PICKUP, count: 16 },
    { status: DonorRequestStatus.DIRECTED_TO_COLLECTION_POINT, count: 8 },
    { status: DonorRequestStatus.DRIVER_ASSIGNED, count: 10 },
    { status: DonorRequestStatus.DRIVER_ON_THE_WAY, count: 6 },
    { status: DonorRequestStatus.DRIVER_ARRIVED, count: 5 },
    { status: DonorRequestStatus.COLLECTED, count: 12 },
    { status: DonorRequestStatus.GOING_TO_COLLECTION_POINT, count: 6 },
    { status: DonorRequestStatus.DELIVERED_TO_COLLECTION_POINT, count: 14 },
    { status: DonorRequestStatus.WEIGHED, count: 10 },
    { status: DonorRequestStatus.DECLARATION_AVAILABLE, count: 8 },
    { status: DonorRequestStatus.FINISHED, count: 32 },
    { status: DonorRequestStatus.CANCELLED, count: 12 },
  ];

  let requestSeq = 0;
  const allRequests: Awaited<ReturnType<typeof createDonorRequest>>[] = [];

  for (const { status, count } of statusDistribution) {
    for (let i = 0; i < count; i++) {
      const donor = donorsData[requestSeq % donorsData.length];
      const materialName = materialNames[requestSeq % materialNames.length];
      const daysAgo = Math.floor((requestSeq * 2.7) % 120);
      const createdAt = new Date(Date.now() - daysAgo * 86_400_000 - (requestSeq % 12) * 3_600_000);
      const weight = 5 + (requestSeq % 45) + (requestSeq % 3) * 2.5;

      const request = await createDonorRequest(
        donor.name,
        donor.whatsapp,
        donor.address,
        donor.city,
        materialName,
        descriptions[requestSeq % descriptions.length],
        weight,
        pickupTimes[requestSeq % pickupTimes.length],
        status,
        status === DonorRequestStatus.CANCELLED
          ? { cancelReason: 'Doador desistiu ou endereço inacessível.', createdAt }
          : status === DonorRequestStatus.UNDER_REVIEW
            ? { operatorNotes: 'Em triagem pelo operador.', createdAt }
            : { createdAt },
      );

      allRequests.push(request);
      requestSeq++;

      if (status === DonorRequestStatus.REQUESTED) {
        await prisma.businessEvent.create({
          data: {
            entityType: 'donor_request',
            entityId: request.id,
            type: BusinessEventType.DONOR_REQUEST_CREATED,
            payload: { donorName: donor.name, status },
          },
        });
      }
    }
  }

  const activeRouteRequest =
    allRequests.find((r) => r.status === DonorRequestStatus.DRIVER_ON_THE_WAY) ?? allRequests[0];
  const weightedStatuses: DonorRequestStatus[] = [
    DonorRequestStatus.FINISHED,
    DonorRequestStatus.DECLARATION_AVAILABLE,
    DonorRequestStatus.WEIGHED,
    DonorRequestStatus.DELIVERED_TO_COLLECTION_POINT,
  ];
  const finishedForWeights = allRequests.filter((r) => weightedStatuses.includes(r.status));

  // =========================================================================
  // Rotas
  // =========================================================================

  // Active route: DRIVER_ON_THE_WAY
  const driver = await prisma.driver.findFirst({ where: { userId: driverUser.id } });
  const driver2 = await prisma.driver.findFirst({ where: { userId: driverUser2.id } });
  if (driver && activeRouteRequest) {
    const routeTrackingToken = crypto.randomUUID().replace(/-/g, '').substring(0, 16);

    await prisma.route.upsert({
      where: { donorRequestId: activeRouteRequest.id },
      update: {},
      create: {
        donorRequestId: activeRouteRequest.id,
        driverId: driver.id,
        status: RouteStatus.IN_PROGRESS,
        trackingToken: routeTrackingToken,
        startedAt: new Date(),
        stops: {
          create: [
            {
              sequence: 1,
              type: 'DONOR_ADDRESS',
              address: activeRouteRequest.address,
              lat: -3.7319,
              lng: -38.5267,
            },
            {
              sequence: 2,
              type: 'COLLECTION_POINT',
              address: 'Rua Barão do Rio Branco, 500',
              lat: -3.7219,
              lng: -38.5234,
            },
          ],
        },
      },
    });

    await prisma.businessEvent.create({
      data: {
        entityType: 'route',
        entityId: activeRouteRequest.id,
        type: BusinessEventType.ROUTE_STARTED,
        payload: { routeId: activeRouteRequest.id, driverId: driver.id },
      },
    });
  }

  // Additional active routes
  const inProgressStatuses: DonorRequestStatus[] = [
    DonorRequestStatus.DRIVER_ASSIGNED,
    DonorRequestStatus.DRIVER_ARRIVED,
    DonorRequestStatus.COLLECTED,
    DonorRequestStatus.GOING_TO_COLLECTION_POINT,
  ];
  const extraActive = allRequests.filter((r) => inProgressStatuses.includes(r.status)).slice(0, 4);
  for (let i = 0; i < extraActive.length; i++) {
    const req = extraActive[i];
    const assignedDriver = i % 2 === 0 ? driver : driver2;
    if (!assignedDriver) continue;

    await prisma.route.upsert({
      where: { donorRequestId: req.id },
      update: {},
      create: {
        donorRequestId: req.id,
        driverId: assignedDriver.id,
        status: RouteStatus.IN_PROGRESS,
        trackingToken: crypto.randomUUID().replace(/-/g, '').substring(0, 16),
        startedAt: new Date(Date.now() - (i + 1) * 3_600_000),
      },
    });
  }

  const pointCentro = pointRecords['Ecoponto Centro/Fortaleza'];

  // Finished routes for completed requests
  const finishedRequests = finishedForWeights.slice(0, 18);
  for (let i = 0; i < finishedRequests.length; i++) {
    const donorReq = finishedRequests[i];
    const assignedDriver = i % 2 === 0 ? driver : driver2;
    const startedAt = new Date(Date.now() - (10 + i) * 86_400_000);
    const finishedAt = new Date(startedAt.getTime() + 4 * 3_600_000);

    await prisma.route.upsert({
      where: { donorRequestId: donorReq.id },
      update: {},
      create: {
        donorRequestId: donorReq.id,
        driverId: assignedDriver?.id,
        status: RouteStatus.FINISHED,
        trackingToken: crypto.randomUUID().replace(/-/g, '').substring(0, 16),
        startedAt,
        finishedAt,
        ...(pointCentro && i % 2 === 0
          ? {
              stops: {
                create: [
                  {
                    sequence: 1,
                    type: 'DONOR_ADDRESS',
                    address: donorReq.address,
                    lat: -3.735,
                    lng: -38.493,
                  },
                  {
                    sequence: 2,
                    type: 'COLLECTION_POINT',
                    collectionPointId: pointCentro,
                    address: 'Rua Barão do Rio Branco, 500',
                    lat: -3.7219,
                    lng: -38.5234,
                  },
                ],
              },
            }
          : {}),
      },
    });
  }

  // =========================================================================
  // Registros de pesagem para rotas finalizadas
  // =========================================================================

  for (const donor of finishedForWeights) {
    const route = await prisma.route.findFirst({ where: { donorRequestId: donor.id } });
    const gross = donor.estimatedWeightKg ? Number(donor.estimatedWeightKg) + 2 : 12;

    await prisma.weightRecord.upsert({
      where: { donorRequestId: donor.id },
      update: {},
      create: {
        donorRequestId: donor.id,
        routeId: route?.id,
        collectionPointId: pointCentro || undefined,
        grossWeightKg: gross,
        netWeightKg: Number(donor.estimatedWeightKg ?? 10),
        tareKg: 2,
        notes: 'Pesagem confirmada pelo operador do ecoponto.',
        confirmedByUserId: collectorUser.id,
        createdAt: donor.createdAt,
      },
    });
  }

  // =========================================================================
  // Declarações para pesagens registradas
  // =========================================================================

  const declarationStatuses: DonorRequestStatus[] = [
    DonorRequestStatus.FINISHED,
    DonorRequestStatus.DECLARATION_AVAILABLE,
  ];
  const declarationRequests = finishedForWeights.filter((r) =>
    declarationStatuses.includes(r.status),
  );

  for (const donor of declarationRequests) {
    const weightRecord = await prisma.weightRecord.findFirst({ where: { donorRequestId: donor.id } });
    if (!weightRecord) continue;

    const declarationCode = `DEC-${Date.now().toString(36).toUpperCase()}-${donor.trackingCode.split('-').pop()}`;

    await prisma.declaration.upsert({
      where: { donorRequestId: donor.id },
      update: {},
      create: {
        donorRequestId: donor.id,
        weightRecordId: weightRecord.id,
        code: declarationCode,
        validationToken: crypto.randomUUID(),
        generatedAt: new Date(),
      },
    });

    await prisma.businessEvent.create({
      data: {
        entityType: 'declaration',
        entityId: declarationCode,
        type: BusinessEventType.DECLARATION_GENERATED,
        payload: { donorRequestId: donor.id, code: declarationCode },
      },
    });
  }

  // =========================================================================
  // Direcionamentos para pontos de coleta
  // =========================================================================

  const underReviewSample = allRequests.find((r) => r.status === DonorRequestStatus.UNDER_REVIEW);
  if (pointCentro && operator && underReviewSample) {
    await prisma.pickupDecision.upsert({
      where: { donorRequestId: underReviewSample.id },
      update: {},
      create: {
        donorRequestId: underReviewSample.id,
        willPickup: false,
        collectionPointId: pointCentro,
        decidedByUserId: operator.id,
        notes: 'Direcionar doador para o Ecoponto Centro — material de pequeno volume.',
      },
    });
  }

  // =========================================================================
  // Resumo
  // =========================================================================

  console.log(`
╔═══════════════════════════════════════════════════╗
║               EcoLogi — Seed                     ║
╠═══════════════════════════════════════════════════╣
║                                                   ║
║  Usuários (senha: 123456)                        ║
║  ─────────────────────────                        ║
║    admin@ecologi.com.br         (ADMIN)           ║
║    operador@ecologi.com.br      (OPERATOR)        ║
║    motorista@ecologi.com.br     (DRIVER)          ║
║    motorista2@ecologi.com.br    (DRIVER)          ║
║    ponto@ecologi.com.br      (PT_OPERATOR)        ║
║    doador@ecologi.com.br     (DONOR)              ║
║                                                   ║
║  8  tipos de material                             ║
║  5  pontos de coleta                              ║
║  30 doadores                                      ║
║  ${String(allRequests.length).padStart(3, ' ')} solicitações (distribuídas)          ║
║  ${String(finishedForWeights.length).padStart(3, ' ')} pesagens registradas              ║
║  ${String(declarationRequests.length).padStart(3, ' ')} declarações geradas              ║
║  5+ rotas em andamento / finalizadas              ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
  `);
}

main().catch(console.error).finally(() => prisma.$disconnect());
