import { PrismaClient, UserRole, DonorRequestStatus, RouteStatus, BusinessEventType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('123456', 10);

  // =========================================================================
  // Limpeza completa (ordem respeita FK)
  // =========================================================================
  await prisma.businessEvent.deleteMany();
  await prisma.declaration.deleteMany();
  await prisma.weightRecord.deleteMany();
  await prisma.driverLocationSnapshot.deleteMany();
  await prisma.trackingSession.deleteMany();
  await prisma.routeStop.deleteMany();
  await prisma.route.deleteMany();
  await prisma.pickupDecision.deleteMany();
  await prisma.donorRequestPhoto.deleteMany();
  await prisma.donorRequest.deleteMany();
  await prisma.collectionPoint.deleteMany();
  await prisma.materialType.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.user.deleteMany();
  await prisma.fileAsset.deleteMany();

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
      phone: '(85) 98888-0003',
    },
  });

  await prisma.driver.upsert({
    where: { userId: driverUser.id },
    update: {
      licenseNumber: '12345678900',
      vehiclePlate: 'ABC-1234',
      vehicleModel: 'Fiat Fiorino 2023',
    },
    create: {
      userId: driverUser.id,
      licenseNumber: '12345678900',
      vehiclePlate: 'ABC-1234',
      vehicleModel: 'Fiat Fiorino 2023',
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
      phone: '(85) 98888-0004',
    },
  });

  await prisma.driver.upsert({
    where: { userId: driverUser2.id },
    update: {
      licenseNumber: '98765432100',
      vehiclePlate: 'XYZ-5678',
      vehicleModel: 'VW Kombi 2022',
    },
    create: {
      userId: driverUser2.id,
      licenseNumber: '98765432100',
      vehiclePlate: 'XYZ-5678',
      vehicleModel: 'VW Kombi 2022',
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
    },
  ) {
    const materialTypeId = materialTypeRecords[materialName];
    if (!materialTypeId) throw new Error(`Material type not found: ${materialName}`);

    const trackingCode = `COL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const donorId = donorRecords[donorName];

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
      },
    });
  }

  // REQUESTED
  const donor1 = await createDonorRequest(
    donorsData[0].name, donorsData[0].whatsapp, donorsData[0].address, donorsData[0].city,
    'Papel e papelão', 'Caixas de papelão e jornais velhos — aproximadamente 15 kg.', 15, 'Manhã (08h–12h)',
    DonorRequestStatus.REQUESTED,
  );
  await prisma.businessEvent.create({
    data: {
      entityType: 'donor_request',
      entityId: donor1.id,
      type: BusinessEventType.DONOR_REQUEST_CREATED,
      payload: { donorName: donorsData[0].name, status: DonorRequestStatus.REQUESTED },
    },
  });

  // UNDER_REVIEW
  const donor2 = await createDonorRequest(
    donorsData[1].name, donorsData[1].whatsapp, donorsData[1].address, donorsData[1].city,
    'Plástico', 'Garrafas PET e embalagens plásticas diversas.', 8, 'Tarde (13h–17h)',
    DonorRequestStatus.UNDER_REVIEW,
    { operatorNotes: 'Aguardando confirmação de endereço.' },
  );
  await prisma.businessEvent.create({
    data: {
      entityType: 'donor_request',
      entityId: donor2.id,
      type: BusinessEventType.DONOR_REQUEST_CREATED,
      payload: { donorName: donorsData[1].name, status: DonorRequestStatus.REQUESTED },
    },
  });
  await prisma.businessEvent.create({
    data: {
      entityType: 'donor_request',
      entityId: donor2.id,
      type: BusinessEventType.DONOR_REQUEST_REVIEWED,
      payload: { reviewedBy: operator.name, status: DonorRequestStatus.UNDER_REVIEW },
    },
  });

  // APPROVED_FOR_PICKUP
  const donor3 = await createDonorRequest(
    donorsData[2].name, donorsData[2].whatsapp, donorsData[2].address, donorsData[2].city,
    'Vidro', 'Garrafas de vidro e potes diversos.', 20, 'Manhã (08h–12h)',
    DonorRequestStatus.APPROVED_FOR_PICKUP,
    { operatorNotes: 'Coleta aprovada. Material frágil — embalar com cuidado.' },
  );

  // DRIVER_ON_THE_WAY
  const donor4 = await createDonorRequest(
    donorsData[3].name, donorsData[3].whatsapp, donorsData[3].address, donorsData[3].city,
    'Metal', 'Latas de alumínio e ferragens de reforma.', 30, 'Tarde (13h–17h)',
    DonorRequestStatus.DRIVER_ON_THE_WAY,
  );

  // COLLECTED
  const donor5 = await createDonorRequest(
    donorsData[4].name, donorsData[4].whatsapp, donorsData[4].address, donorsData[4].city,
    'Papel e papelão', 'Grande volume de papelão de mudança.', 50, 'Manhã (08h–12h)',
    DonorRequestStatus.COLLECTED,
  );

  // DELIVERED_TO_COLLECTION_POINT
  const donor6 = await createDonorRequest(
    donorsData[5].name, donorsData[5].whatsapp, donorsData[5].address, donorsData[5].city,
    'Eletrônicos', '2 computadores antigos, 3 monitores, cabos diversos.', 12, 'Tarde (13h–17h)',
    DonorRequestStatus.DELIVERED_TO_COLLECTION_POINT,
  );

  // FINISHED
  const donor7 = await createDonorRequest(
    donorsData[6].name, donorsData[6].whatsapp, donorsData[6].address, donorsData[6].city,
    'Plástico', 'Sacos de garrafas PET e embalagens limpas.', 10, 'Manhã (08h–12h)',
    DonorRequestStatus.FINISHED,
  );

  const donor8 = await createDonorRequest(
    donorsData[7].name, donorsData[7].whatsapp, donorsData[7].address, donorsData[7].city,
    'Óleo de cozinha', 'Aproximadamente 10 litros de óleo usado armazenados em garrafas PET.', 10, 'Manhã (08h–12h)',
    DonorRequestStatus.FINISHED,
  );

  // CANCELLED
  const donor9 = await createDonorRequest(
    donorsData[8].name, donorsData[8].whatsapp, donorsData[8].address, donorsData[8].city,
    'Madeira', 'Sobras de móveis de madeira.', 40, 'Tarde (13h–17h)',
    DonorRequestStatus.CANCELLED,
    { cancelReason: 'Doador desistiu da coleta.' },
  );

  // Additional requests in other cities
  const donor10 = await createDonorRequest(
    donorsData[9].name, donorsData[9].whatsapp, donorsData[9].address, donorsData[9].city,
    'Papel e papelão', 'Material de escritório para descarte.', 5, 'Manhã (08h–12h)',
    DonorRequestStatus.REQUESTED,
  );

  const donor11 = await createDonorRequest(
    donorsData[10].name, donorsData[10].whatsapp, donorsData[10].address, donorsData[10].city,
    'Metal', 'Sucata de ferro e alumínio de oficina.', 60, 'Tarde (13h–17h)',
    DonorRequestStatus.UNDER_REVIEW,
  );

  const donor12 = await createDonorRequest(
    donorsData[11].name, donorsData[11].whatsapp, donorsData[11].address, donorsData[11].city,
    'Plástico', 'Garrafas PET e embalagens recicláveis.', 25, 'Tarde (13h–17h)',
    DonorRequestStatus.APPROVED_FOR_PICKUP,
  );

  // =========================================================================
  // Rotas
  // =========================================================================

  // Active route: DRIVER_ON_THE_WAY (donor4)
  const driver = await prisma.driver.findFirst({ where: { userId: driverUser.id } });
  if (driver) {
    const routeTrackingToken = crypto.randomUUID().replace(/-/g, '').substring(0, 16);

    await prisma.route.upsert({
      where: { donorRequestId: donor4.id },
      update: {},
      create: {
        donorRequestId: donor4.id,
        driverId: driver.id,
        status: RouteStatus.IN_PROGRESS,
        trackingToken: routeTrackingToken,
        startedAt: new Date(),
        stops: {
          create: [
            {
              sequence: 1,
              type: 'DONOR_ADDRESS',
              address: 'Rua Pereira Filgueiras, 150',
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
        entityId: donor4.id,
        type: BusinessEventType.ROUTE_STARTED,
        payload: { routeId: donor4.id, driverId: driver.id },
      },
    });
  }

  // Finished route (donor7)
  const pointCentro = pointRecords['Ecoponto Centro/Fortaleza'];
  if (pointCentro) {
    await prisma.route.upsert({
      where: { donorRequestId: donor7.id },
      update: {},
      create: {
        donorRequestId: donor7.id,
        driverId: driver?.id,
        status: RouteStatus.FINISHED,
        trackingToken: crypto.randomUUID().replace(/-/g, '').substring(0, 16),
        startedAt: new Date(Date.now() - 86400000 * 2),
        finishedAt: new Date(Date.now() - 86400000),
        stops: {
          create: [
            {
              sequence: 1,
              type: 'DONOR_ADDRESS',
              address: 'Rua Vicente Leite, 1500',
              lat: -3.7350,
              lng: -38.4930,
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
      },
    });
  }

  // Finished route (donor8)
  await prisma.route.upsert({
    where: { donorRequestId: donor8.id },
    update: {},
    create: {
      donorRequestId: donor8.id,
      driverId: driver?.id,
      status: RouteStatus.FINISHED,
      trackingToken: crypto.randomUUID().replace(/-/g, '').substring(0, 16),
      startedAt: new Date(Date.now() - 86400000 * 5),
      finishedAt: new Date(Date.now() - 86400000 * 4),
    },
  });

  // =========================================================================
  // Registros de pesagem para rotas finalizadas
  // =========================================================================

  for (const donor of [donor7, donor8]) {
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
      },
    });
  }

  // =========================================================================
  // Declarações para pesagens registradas
  // =========================================================================

  for (const donor of [donor7, donor8]) {
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

  if (pointCentro && operator) {
    await prisma.pickupDecision.upsert({
      where: { donorRequestId: donor2.id },
      update: {},
      create: {
        donorRequestId: donor2.id,
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
║  12 solicitações (4 REQUESTED,                    ║
║    2 UNDER_REVIEW, 2 APPROVED,                   ║
║    1 DRIVER_ON_THE_WAY, 1 COLLECTED,             ║
║    1 DELIVERED, 2 FINISHED, 1 CANCELLED)         ║
║  3  rotas (1 em andamento, 2 finalizadas)         ║
║  2  pesagens                                      ║
║  2  declarações                                   ║
║  1  direcionamento para ecoponto                  ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
  `);
}

main().catch(console.error).finally(() => prisma.$disconnect());
