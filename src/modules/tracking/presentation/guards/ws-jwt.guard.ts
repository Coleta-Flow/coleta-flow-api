import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient();
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) throw new WsException('Unauthorized');

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.config.get<string>('JWT_SECRET'),
      });
      (client as any).user = payload;
      return true;
    } catch {
      throw new WsException('Unauthorized');
    }
  }
}
