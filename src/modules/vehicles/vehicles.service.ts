import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto';

const vehicleInclude = {
  drivers: {
    where: { deletedAt: null, active: true },
    select: {
      id: true,
      user: { select: { id: true, name: true } },
    },
  },
} as const;

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(availableOnly = false) {
    return this.prisma.vehicle.findMany({
      where: {
        deletedAt: null,
        ...(availableOnly
          ? {
              active: true,
              drivers: { none: { deletedAt: null, active: true } },
            }
          : {}),
      },
      include: vehicleInclude,
      orderBy: { plate: 'asc' },
    });
  }

  async findById(id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, deletedAt: null },
      include: vehicleInclude,
    });
    if (!vehicle) throw new NotFoundException('Veículo não encontrado.');
    return vehicle;
  }

  async create(dto: CreateVehicleDto) {
    const existing = await this.prisma.vehicle.findFirst({
      where: { plate: dto.plate, deletedAt: null },
    });
    if (existing) throw new ConflictException('Placa já cadastrada.');

    return this.prisma.vehicle.create({
      data: {
        plate: dto.plate.trim().toUpperCase(),
        model: dto.model.trim(),
        brand: dto.brand?.trim(),
        capacityKg: dto.capacityKg,
      },
      include: vehicleInclude,
    });
  }

  async update(id: string, dto: UpdateVehicleDto) {
    await this.findById(id);

    if (dto.plate) {
      const existing = await this.prisma.vehicle.findFirst({
        where: { plate: dto.plate, deletedAt: null, NOT: { id } },
      });
      if (existing) throw new ConflictException('Placa já cadastrada.');
    }

    const vehicle = await this.prisma.vehicle.update({
      where: { id },
      data: {
        ...(dto.plate !== undefined ? { plate: dto.plate.trim().toUpperCase() } : {}),
        ...(dto.model !== undefined ? { model: dto.model.trim() } : {}),
        ...(dto.brand !== undefined ? { brand: dto.brand?.trim() || null } : {}),
        ...(dto.capacityKg !== undefined ? { capacityKg: dto.capacityKg } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
      include: vehicleInclude,
    });

    if (dto.plate || dto.model || dto.brand !== undefined) {
      const assignedDrivers = await this.prisma.driver.findMany({
        where: { vehicleId: id, deletedAt: null },
      });
      for (const driver of assignedDrivers) {
        await this.prisma.driver.update({
          where: { id: driver.id },
          data: {
            vehiclePlate: vehicle.plate,
            vehicleModel: [vehicle.brand, vehicle.model].filter(Boolean).join(' '),
          },
        });
      }
    }

    return vehicle;
  }

  async deactivate(id: string) {
    await this.findById(id);
    await this.prisma.$transaction([
      this.prisma.driver.updateMany({
        where: { vehicleId: id },
        data: { vehicleId: null, vehiclePlate: null, vehicleModel: null },
      }),
      this.prisma.vehicle.update({
        where: { id },
        data: { active: false, deletedAt: new Date() },
      }),
    ]);
    return { message: 'Veículo desativado com sucesso.' };
  }
}
