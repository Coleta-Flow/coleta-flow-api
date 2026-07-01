import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateDonorDto } from './dto/create-donor.dto';
import { UpdateDonorDto } from './dto/update-donor.dto';

@Injectable()
export class DonorService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDonorDto) {
    if (dto.cpfCnpj) {
      const existing = await this.prisma.donor.findUnique({
        where: { cpfCnpj: dto.cpfCnpj },
      });
      if (existing) throw new ConflictException('CPF/CNPJ já cadastrado.');
    }

    if (dto.email) {
      const existing = await this.prisma.donor.findFirst({
        where: { email: dto.email, deletedAt: null },
      });
      if (existing) throw new ConflictException('E-mail já cadastrado.');
    }

    return this.prisma.donor.create({ data: dto });
  }

  async findAll(query: { city?: string; active?: string; page?: number; limit?: number }) {
    const { city, active, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (city) where.city = { contains: city };
    if (active !== undefined) where.active = active === 'true';

    const [data, total] = await Promise.all([
      this.prisma.donor.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { _count: { select: { donorRequests: true } } },
      }),
      this.prisma.donor.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const donor = await this.prisma.donor.findUnique({
      where: { id },
      include: { _count: { select: { donorRequests: true } } },
    });
    if (!donor || donor.deletedAt) throw new NotFoundException('Doador não encontrado.');
    return donor;
  }

  async update(id: string, dto: UpdateDonorDto) {
    const donor = await this.prisma.donor.findUnique({ where: { id } });
    if (!donor || donor.deletedAt) throw new NotFoundException('Doador não encontrado.');

    if (dto.cpfCnpj && dto.cpfCnpj !== donor.cpfCnpj) {
      const conflict = await this.prisma.donor.findUnique({
        where: { cpfCnpj: dto.cpfCnpj },
      });
      if (conflict) throw new ConflictException('CPF/CNPJ já cadastrado.');
    }

    return this.prisma.donor.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const donor = await this.prisma.donor.findUnique({ where: { id } });
    if (!donor || donor.deletedAt) throw new NotFoundException('Doador não encontrado.');

    return this.prisma.donor.update({
      where: { id },
      data: { active: false, deletedAt: new Date() },
    });
  }

  async getHistory(id: string) {
    const donor = await this.prisma.donor.findUnique({ where: { id } });
    if (!donor || donor.deletedAt) throw new NotFoundException('Doador não encontrado.');

    const requests = await this.prisma.donorRequest.findMany({
      where: { donorId: id },
      include: {
        materialType: true,
        weightRecord: true,
        route: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalWeight = requests.reduce(
      (acc, r) => acc + (r.weightRecord ? Number(r.weightRecord.netWeightKg) : 0),
      0,
    );

    return {
      donor,
      requests,
      summary: {
        totalRequests: requests.length,
        totalWeightCollectedKg: totalWeight,
        lastRequest: requests[0] ?? null,
      },
    };
  }
}
