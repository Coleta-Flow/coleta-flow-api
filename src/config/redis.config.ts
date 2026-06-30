import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

export function createRedisClient(config: ConfigService): Redis {
  return new Redis({
    host: config.get<string>('REDIS_HOST'),
    port: config.get<number>('REDIS_PORT'),
    password: config.get<string>('REDIS_PASSWORD') || undefined,
    retryStrategy: (times) => Math.min(times * 100, 3000),
  });
}

export const redisKeys = {
  driverLocation: (driverId: string) => `driver:${driverId}:location`,
  routeLiveLocation: (routeId: string) => `route:${routeId}:live-location`,
  trackingSession: (token: string) => `tracking:${token}:session`,
};
