import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'node:crypto';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshDto } from './dto/refresh.dto';

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

    return this.generateTokens(user);
  }

  async register(_dto: RegisterDto) {
    throw new BadRequestException(
      'Cadastro disponível apenas via formulário de solicitação de coleta. Acesse o site e solicite uma coleta para criar sua conta.',
    );
  }

  async socialLogin(provider: string, data: { token: string; name?: string; email?: string }) {
    if (!data.email) {
      throw new UnauthorizedException('E-mail é obrigatório para login social.');
    }

    const user = await this.prisma.user.findFirst({
      where: { email: data.email, deletedAt: null },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Conta não encontrada. Solicite uma coleta ou peça ao administrador para criar seu acesso.',
      );
    }

    if (!user.active) {
      throw new UnauthorizedException('Usuário desativado.');
    }

    return this.generateTokens(user);
  }

  async refresh(dto: RefreshDto) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: dto.refreshToken, revoked: false },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido ou expirado.');
    }

    if (!stored.user.active) {
      throw new UnauthorizedException('Usuário desativado.');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });

    return this.generateTokens(stored.user);
  }

  async logout(dto: RefreshDto) {
    await this.prisma.refreshToken.updateMany({
      where: { token: dto.refreshToken, revoked: false },
      data: { revoked: true },
    });
    return { message: 'Sessão encerrada com sucesso.' };
  }

  async issueTokensForUser(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, active: true, deletedAt: null },
    });
    if (!user) throw new UnauthorizedException('Usuário não encontrado.');
    return this.generateTokens(user);
  }

  private async generateTokens(user: {
    id: string;
    name: string;
    email: string;
    roleId: string;
    role: UserRole;
  }) {
    const payload = { sub: user.id, roleId: user.roleId };

    const accessToken = this.jwt.sign(payload);

    const tokenValue = crypto.randomUUID();
    const refreshToken = await this.prisma.refreshToken.create({
      data: {
        token: tokenValue,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken: refreshToken.token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
