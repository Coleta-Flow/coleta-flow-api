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
import { Server, Socket } from 'socket.io';
import { TrackingRedisService, DriverLocationPayload } from '../../infrastructure/redis/tracking-redis.service';
import { WsJwtGuard } from '../guards/ws-jwt.guard';

@WebSocketGateway({ namespace: '/tracking', cors: { origin: '*' } })
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(TrackingGateway.name);

  constructor(private readonly trackingRedis: TrackingRedisService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
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
        client.emit('error', { code: 'TRACKING_TOKEN_EXPIRED', message: 'Token inválido ou expirado.' });
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
      client.emit('error', { code: 'FORBIDDEN', message: 'Você não pode enviar localização para outro motorista.' });
      return;
    }

    await this.trackingRedis.saveDriverLocation(payload);
    await this.trackingRedis.saveRouteLiveLocation(payload.routeId, payload);

    const updatedAt = new Date().toISOString();
    const routeRoom = `route:${payload.routeId}`;
    this.server.to(routeRoom).emit('tracking:update', { ...payload, updatedAt });
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
