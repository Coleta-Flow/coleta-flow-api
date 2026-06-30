import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('123456', 10);

  await prisma.user.upsert({
    where: { email: 'cordeiro@adm.com' },
    update: { password: hash },
    create: { name: 'Cordeiro Admin', email: 'cordeiro@adm.com', password: hash, role: 'ADMIN' },
  });

  await prisma.user.upsert({
    where: { email: 'cordeiro@empresa.com' },
    update: { password: hash },
    create: { name: 'Cordeiro Empresa', email: 'cordeiro@empresa.com', password: hash, role: 'OPERATOR' },
  });

  const driverUser = await prisma.user.upsert({
    where: { email: 'cordeiro@motorista.com' },
    update: { password: hash },
    create: { name: 'Cordeiro Motorista', email: 'cordeiro@motorista.com', password: hash, role: 'DRIVER' },
  });

  await prisma.driver.upsert({
    where: { userId: driverUser.id },
    update: {},
    create: { userId: driverUser.id, vehiclePlate: 'ABC-1234', vehicleModel: 'Fiat Fiorino' },
  });

  console.log('Seed concluído: 3 usuários criados.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
