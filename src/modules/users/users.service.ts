import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserRole, RouteStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { EmailService } from '../notifications/email.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, ChangePasswordDto } from './dto/update-user.dto';

const ACTIVE_ROUTE_STATUSES: RouteStatus[] = [
  RouteStatus.PLANNED,
  RouteStatus.ASSIGNED,
  RouteStatus.IN_PROGRESS,
  RouteStatus.ARRIVED_AT_DONOR,
  RouteStatus.COLLECTED,
  RouteStatus.GOING_TO_COLLECTION_POINT,
  RouteStatus.ARRIVED_AT_COLLECTION_POINT,
  RouteStatus.DELIVERED,
  RouteStatus.WEIGHED,
];

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

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

  findDrivers(availableOnly = false) {
    return this.prisma.user.findMany({
      where: {
        roleRel: { name: UserRole.DRIVER },
        active: true,
        deletedAt: null,
        driver: {
          active: true,
          deletedAt: null,
          ...(availableOnly
            ? {
                routes: {
                  none: { status: { in: ACTIVE_ROUTE_STATUSES } },
                },
              }
            : {}),
        },
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
    const user = await this.prisma.user.create({
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

    await this.emailService.send({
      to: dto.email,
      subject: 'Acesso à plataforma Eco Logi',
      text: [
        `Olá ${dto.name},`,
        '',
        'Sua conta na plataforma Eco Logi foi criada por um administrador.',
        '',
        `E-mail: ${dto.email}`,
        `Senha temporária: ${dto.password}`,
        '',
        'Recomendamos alterar sua senha após o primeiro acesso.',
        '',
        'Acesse: https://app.ecologi.com.br/login',
      ].join('\n'),
      html: [
        `<p>Olá <strong>${dto.name}</strong>,</p>`,
        '<p>Sua conta na plataforma <strong>Eco Logi</strong> foi criada por um administrador.</p>',
        `<p><strong>E-mail:</strong> ${dto.email}<br/>`,
        `<strong>Senha temporária:</strong> ${dto.password}</p>`,
        '<p>Recomendamos alterar sua senha após o primeiro acesso.</p>',
        '<p><a href="https://app.ecologi.com.br/login">Acessar plataforma</a></p>',
      ].join(''),
    });

    return user;
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
