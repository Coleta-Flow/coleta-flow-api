import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('123456', 10);

  // Admin
  await prisma.user.upsert({
    where: { email: 'cordeiro@adm.com' },
    update: { password: hash },
    create: {
      name: 'Cordeiro Admin',
      email: 'cordeiro@adm.com',
      password: hash,
      role: UserRole.ADMIN,
    },
  });

  // Operador da empresa
  await prisma.user.upsert({
    where: { email: 'cordeiro@empresa.com' },
    update: { password: hash },
    create: {
      name: 'Cordeiro Empresa',
      email: 'cordeiro@empresa.com',
      password: hash,
      role: UserRole.OPERATOR,
    },
  });

  // Motorista
  const driverUser = await prisma.user.upsert({
    where: { email: 'cordeiro@motorista.com' },
    update: { password: hash },
    create: {
      name: 'Cordeiro Motorista',
      email: 'cordeiro@motorista.com',
      password: hash,
      role: UserRole.DRIVER,
    },
  });

  await prisma.driver.upsert({
    where: { userId: driverUser.id },
    update: {},
    create: {
      userId: driverUser.id,
      vehiclePlate: 'ABC-1234',
      vehicleModel: 'Fiat Fiorino',
    },
  });

  console.log('Seed OK: cordeiro@adm.com | cordeiro@empresa.com | cordeiro@motorista.com — senha: 123456');
}

main().catch(console.error).finally(() => prisma.$disconnect());
