import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateMaterialTypeDto } from './dto/create-material-type.dto';
import { UpdateMaterialTypeDto } from './dto/update-material-type.dto';

@Injectable()
export class MaterialTypesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(includeInactive = false) {
    return this.prisma.materialType.findMany({
      where: includeInactive ? {} : { active: true },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const materialType = await this.prisma.materialType.findFirst({
      where: { id },
    });
    if (!materialType) throw new NotFoundException('Tipo de resíduo não encontrado.');
    return materialType;
  }

  create(dto: CreateMaterialTypeDto) {
    return this.prisma.materialType.create({ data: dto });
  }

  async update(id: string, dto: UpdateMaterialTypeDto) {
    await this.findById(id);
    return this.prisma.materialType.update({ where: { id }, data: dto });
  }

  async deactivate(id: string) {
    await this.findById(id);
    return this.prisma.materialType.update({
      where: { id },
      data: { active: false },
    });
  }
}
