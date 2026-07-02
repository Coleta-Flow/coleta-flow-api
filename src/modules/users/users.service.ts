import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, ChangePasswordDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        roleId: true,
        phone: true,
        active: true,
        createdAt: true,
        driver: {
          select: {
            id: true,
            vehiclePlate: true,
            vehicleModel: true,
            licenseNumber: true,
            active: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  findDrivers() {
    return this.prisma.user.findMany({
      where: {
        roleRel: { name: UserRole.DRIVER },
        active: true,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        driver: {
          select: {
            id: true,
            vehiclePlate: true,
            vehicleModel: true,
            licenseNumber: true,
            active: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        roleId: true,
        phone: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        driver: {
          select: {
            id: true,
            vehiclePlate: true,
            vehicleModel: true,
            licenseNumber: true,
            active: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return user;
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findFirst({ where: { email: dto.email } });
    if (existing) throw new ConflictException('E-mail já está em uso.');

    const role = await this.prisma.role.findUnique({ where: { name: dto.role } });
    if (!role) throw new NotFoundException('Role não encontrada.');

    const hashed = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashed,
        role: dto.role,
        roleId: role.id,
        phone: dto.phone,
      },
      select: {
        id: true,
        name: true,
        email: true,
        roleId: true,
        phone: true,
        active: true,
        createdAt: true,
      },
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findById(id);
    if (dto.email) {
      const existing = await this.prisma.user.findFirst({
        where: { email: dto.email, NOT: { id } },
      });
      if (existing) throw new ConflictException('E-mail já está em uso por outro usuário.');
    }

    const data: any = { ...dto };
    if (dto.role) {
      const role = await this.prisma.role.findUnique({ where: { name: dto.role } });
      if (!role) throw new NotFoundException('Role não encontrada.');
      data.roleId = role.id;
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        roleId: true,
        phone: true,
        active: true,
        updatedAt: true,
      },
    });
  }

  async changePassword(id: string, dto: ChangePasswordDto, isAdmin: boolean) {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    if (!isAdmin && dto.currentPassword) {
      const valid = await bcrypt.compare(dto.currentPassword, user.password);
      if (!valid) throw new UnauthorizedException('Senha atual incorreta.');
    }

    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({ where: { id }, data: { password: hashed } });
    return { message: 'Senha alterada com sucesso.' };
  }

  async deactivate(id: string) {
    await this.findById(id);
    await this.prisma.user.update({
      where: { id },
      data: { active: false, deletedAt: new Date() },
    });
    return { message: 'Usuário desativado com sucesso.' };
  }
}
