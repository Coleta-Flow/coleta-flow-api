import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { REDIS_CLIENT, createRedisClient } from '../../config/redis.config';
import { TrackingGateway } from './presentation/gateways/tracking.gateway';
import { TrackingRedisService } from './infrastructure/redis/tracking-redis.service';
import { MapboxDirectionsService } from './infrastructure/mapbox-directions.service';
import { WsJwtGuard } from './presentation/guards/ws-jwt.guard';
import { PublicTrackingController } from './presentation/controllers/public-tracking.controller';
import { TrackingSessionController } from './presentation/controllers/tracking-session.controller';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN', '7d') },
      }),
    }),
  ],
  controllers: [PublicTrackingController, TrackingSessionController],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: createRedisClient,
    },
    TrackingRedisService,
    TrackingGateway,
    MapboxDirectionsService,
    WsJwtGuard,
  ],
  exports: [TrackingRedisService, TrackingGateway, MapboxDirectionsService, REDIS_CLIENT],
})
export class TrackingModule {}
