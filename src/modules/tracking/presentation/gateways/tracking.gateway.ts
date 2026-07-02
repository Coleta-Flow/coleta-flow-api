import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import {
  TrackingRedisService,
  DriverLocationPayload,
} from '../../infrastructure/redis/tracking-redis.service';
import { WsJwtGuard } from '../guards/ws-jwt.guard';

const ADMIN_ROOM = 'presence:admin';

interface ConnectedDriver {
  userId: string;
  name: string;
}

@WebSocketGateway({ namespace: '/tracking', cors: { origin: '*' } })
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(TrackingGateway.name);

  // socketId -> dados do motorista conectado (em memória — reinicia com o processo)
  private readonly onlineDrivers = new Map<string, ConnectedDriver>();

  constructor(
    private readonly trackingRedis: TrackingRedisService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);

    const token =
      client.handshake.auth?.token ||
      client.handshake.headers.authorization?.replace('Bearer ', '');
    if (!token) return; // conexão pública (doador rastreando por link) — sem presença

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.config.get<string>('JWT_SECRET'),
      });
      (client as any).user = payload;

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { roleRel: true },
      });
      if (!user) return;

      if (user.roleRel.name === UserRole.DRIVER) {
        this.onlineDrivers.set(client.id, { userId: user.id, name: user.name });
        this.broadcastPresence();
      } else if (user.roleRel.name === UserRole.ADMIN || user.roleRel.name === UserRole.OPERATOR) {
        client.join(ADMIN_ROOM);
        client.emit('presence:update', this.presenceSnapshot());
      }
    } catch {
      // token inválido/expirado — trata como conexão anônima, não derruba o socket
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    if (this.onlineDrivers.delete(client.id)) {
      this.broadcastPresence();
    }
  }

  private presenceSnapshot() {
    const drivers = Array.from(this.onlineDrivers.values());
    return { count: drivers.length, drivers };
  }

  private broadcastPresence() {
    this.server.to(ADMIN_ROOM).emit('presence:update', this.presenceSnapshot());
  }

  // Público — assina sala por routeId (monitor) ou token (doador)
  @SubscribeMessage('tracking:subscribe')
  async handleSubscribe(
    @MessageBody() data: { token?: string; routeId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (data.token) {
      const session = await this.trackingRedis.getTrackingSession(data.token);
      if (!session) {
        client.emit('error', {
          code: 'TRACKING_TOKEN_EXPIRED',
          message: 'Token inválido ou expirado.',
        });
        return;
      }
      client.join(`tracking:${data.token}`);
    }

    if (data.routeId) {
      client.join(`route:${data.routeId}`);
    }
  }

  // Autenticado — motorista envia localização via WebSocket
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('driver:location:update')
  async handleLocationUpdate(
    @MessageBody() payload: DriverLocationPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const socketUser = (client as any).user;

    // Valida que o motorista só envia localização para sua própria rota
    if (socketUser?.sub && payload.driverId && socketUser.sub !== payload.driverId) {
      client.emit('error', {
        code: 'FORBIDDEN',
        message: 'Você não pode enviar localização para outro motorista.',
      });
      return;
    }

    await this.trackingRedis.saveDriverLocation(payload);

    const updatedAt = new Date().toISOString();
    const enrichedPayload = { ...payload, updatedAt };

    // Rota específica (monitor de uma coleta em andamento / doador com link público)
    if (payload.routeId) {
      await this.trackingRedis.saveRouteLiveLocation(payload.routeId, payload);
      this.server.to(`route:${payload.routeId}`).emit('tracking:update', enrichedPayload);
    }

    // Console admin — mapa de monitoramento com todos os motoristas ativos
    this.server.to(ADMIN_ROOM).emit('tracking:update', enrichedPayload);
  }

  emitRouteStatusChanged(routeId: string, status: string) {
    const routeRoom = `route:${routeId}`;
    this.server.to(routeRoom).emit('route:status:changed', {
      routeId,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  emitToTrackingToken(token: string, event: string, data: unknown) {
    this.server.to(`tracking:${token}`).emit(event, data);
  }
}
