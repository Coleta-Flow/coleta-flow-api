import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { REDIS_CLIENT, createRedisClient } from '../../config/redis.config';
import { TrackingGateway } from './presentation/gateways/tracking.gateway';
import { TrackingRedisService } from './infrastructure/redis/tracking-redis.service';
import { WsJwtGuard } from './presentation/guards/ws-jwt.guard';
import { PublicTrackingController } from './presentation/controllers/public-tracking.controller';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN', '7d') },
      }),
    }),
  ],
  controllers: [PublicTrackingController],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: createRedisClient,
    },
    TrackingRedisService,
    TrackingGateway,
    WsJwtGuard,
  ],
  exports: [TrackingRedisService, TrackingGateway, REDIS_CLIENT],
})
export class TrackingModule {}
