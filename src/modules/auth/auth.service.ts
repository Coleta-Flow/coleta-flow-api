import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, active: true, deletedAt: null },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const payload = { sub: user.id, role: user.role };

    return {
      accessToken: this.jwt.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('E-mail já cadastrado.');

    const hashed = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashed,
        role: UserRole.DONOR,
        phone: dto.phone,
      },
    });

    const payload = { sub: user.id, role: user.role };

    return {
      accessToken: this.jwt.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async socialLogin(provider: string, data: { token: string; name?: string; email?: string }) {
    // Em produção, verificar o token com o provider (Google/Facebook)
    // Para o MVP, aceitamos dados informados e criamos/queries o usuário
    if (!data.email) {
      throw new UnauthorizedException('E-mail é obrigatório para login social.');
    }

    let user = await this.prisma.user.findFirst({
      where: { email: data.email, deletedAt: null },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          name: data.name ?? data.email.split('@')[0],
          email: data.email,
          password: await bcrypt.hash(Math.random().toString(36), 10),
          role: UserRole.DONOR,
        },
      });
    }

    if (!user.active) {
      throw new UnauthorizedException('Usuário desativado.');
    }

    const payload = { sub: user.id, role: user.role };

    return {
      accessToken: this.jwt.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
