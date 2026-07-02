import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { EmailService } from '../notifications/email.service';
import { CreateDriverDto, UpdateDriverDto } from './dto/driver.dto';

const driverInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      active: true,
      createdAt: true,
    },
  },
  vehicle: {
    select: {
      id: true,
      plate: true,
      brand: true,
      model: true,
      capacityKg: true,
      active: true,
    },
  },
} as const;

@Injectable()
export class DriversService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  findAll() {
    return this.prisma.driver.findMany({
      where: { deletedAt: null },
      include: driverInclude,
      orderBy: { user: { name: 'asc' } },
    });
  }

  async findById(id: string) {
    const driver = await this.prisma.driver.findFirst({
      where: { id, deletedAt: null },
      include: driverInclude,
    });
    if (!driver) throw new NotFoundException('Motorista não encontrado.');
    return driver;
  }

  async create(dto: CreateDriverDto) {
    const existing = await this.prisma.user.findFirst({ where: { email: dto.email } });
    if (existing) throw new ConflictException('E-mail já está em uso.');

    if (dto.vehicleId) {
      await this.assertVehicleAvailable(dto.vehicleId);
    }

    const role = await this.prisma.role.findUnique({ where: { name: UserRole.DRIVER } });
    if (!role) throw new NotFoundException('Role de motorista não encontrada.');

    const vehicle = dto.vehicleId
      ? await this.prisma.vehicle.findFirst({ where: { id: dto.vehicleId, deletedAt: null } })
      : null;

    const hashed = await bcrypt.hash(dto.password, 10);
    const driver = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          password: hashed,
          role: UserRole.DRIVER,
          roleId: role.id,
          phone: dto.phone,
        },
      });

      return tx.driver.create({
        data: {
          userId: user.id,
          licenseNumber: dto.licenseNumber,
          vehicleId: dto.vehicleId ?? null,
          vehiclePlate: vehicle?.plate ?? null,
          vehicleModel: vehicle ? [vehicle.brand, vehicle.model].filter(Boolean).join(' ') : null,
        },
        include: driverInclude,
      });
    });

    await this.emailService.send({
      to: dto.email,
      subject: 'Acesso à plataforma Eco Logi',
      text: [
        `Olá ${dto.name},`,
        '',
        'Sua conta de motorista na plataforma Eco Logi foi criada.',
        '',
        `E-mail: ${dto.email}`,
        `Senha temporária: ${dto.password}`,
        '',
        'Recomendamos alterar sua senha após o primeiro acesso.',
      ].join('\n'),
      html: [
        `<p>Olá <strong>${dto.name}</strong>,</p>`,
        '<p>Sua conta de <strong>motorista</strong> na plataforma Eco Logi foi criada.</p>',
        `<p><strong>E-mail:</strong> ${dto.email}<br/>`,
        `<strong>Senha temporária:</strong> ${dto.password}</p>`,
      ].join(''),
    });

    return driver;
  }

  async update(id: string, dto: UpdateDriverDto) {
    const driver = await this.findById(id);

    if (dto.email) {
      const existing = await this.prisma.user.findFirst({
        where: { email: dto.email, NOT: { id: driver.userId } },
      });
      if (existing) throw new ConflictException('E-mail já está em uso por outro usuário.');
    }

    await this.prisma.user.update({
      where: { id: driver.userId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });

    return this.prisma.driver.update({
      where: { id },
      data: {
        ...(dto.licenseNumber !== undefined ? { licenseNumber: dto.licenseNumber } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
      include: driverInclude,
    });
  }

  async assignVehicle(driverId: string, vehicleId: string | null | undefined) {
    await this.findById(driverId);

    if (vehicleId) {
      await this.assertVehicleAvailable(vehicleId, driverId);
      const vehicle = await this.prisma.vehicle.findFirst({
        where: { id: vehicleId, deletedAt: null, active: true },
      });
      if (!vehicle) throw new NotFoundException('Veículo não encontrado.');

      return this.prisma.driver.update({
        where: { id: driverId },
        data: {
          vehicleId,
          vehiclePlate: vehicle.plate,
          vehicleModel: [vehicle.brand, vehicle.model].filter(Boolean).join(' '),
        },
        include: driverInclude,
      });
    }

    return this.prisma.driver.update({
      where: { id: driverId },
      data: {
        vehicleId: null,
        vehiclePlate: null,
        vehicleModel: null,
      },
      include: driverInclude,
    });
  }

  async deactivate(id: string) {
    const driver = await this.findById(id);
    await this.prisma.$transaction([
      this.prisma.driver.update({
        where: { id },
        data: { active: false, deletedAt: new Date(), vehicleId: null, vehiclePlate: null, vehicleModel: null },
      }),
      this.prisma.user.update({
        where: { id: driver.userId },
        data: { active: false, deletedAt: new Date() },
      }),
    ]);
    return { message: 'Motorista desativado com sucesso.' };
  }

  private async assertVehicleAvailable(vehicleId: string, exceptDriverId?: string) {
    const assigned = await this.prisma.driver.findFirst({
      where: {
        vehicleId,
        deletedAt: null,
        active: true,
        ...(exceptDriverId ? { NOT: { id: exceptDriverId } } : {}),
      },
    });
    if (assigned) {
      throw new ConflictException('Veículo já está atribuído a outro motorista.');
    }
  }
}
