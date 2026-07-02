import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  roleId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub, active: true },
      include: { roleRel: true, donor: { select: { id: true } } },
    });

    if (!user) throw new UnauthorizedException();

    return {
      id: user.id,
      roleId: user.roleId,
      role: user.roleRel.name,
      name: user.name,
      email: user.email,
      donorId: user.donor?.id ?? null,
    };
  }
}
