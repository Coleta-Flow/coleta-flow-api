import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT, redisKeys } from '../../../../config/redis.config';

export interface DriverLocationPayload {
  routeId?: string;
  driverId: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  battery?: number;
  timestamp: string;
}

@Injectable()
export class TrackingRedisService {
  private readonly locationTtlSeconds = 3600;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly config: ConfigService,
  ) {}

  async saveDriverLocation(payload: DriverLocationPayload): Promise<void> {
    const key = redisKeys.driverLocation(payload.driverId);
    await this.redis.setex(key, this.locationTtlSeconds, JSON.stringify(payload));
  }

  async saveRouteLiveLocation(routeId: string, payload: DriverLocationPayload): Promise<void> {
    const key = redisKeys.routeLiveLocation(routeId);
    await this.redis.setex(key, this.locationTtlSeconds, JSON.stringify(payload));
  }

  async getDriverLocation(driverId: string): Promise<DriverLocationPayload | null> {
    const key = redisKeys.driverLocation(driverId);
    const raw = await this.redis.get(key);
    return raw ? JSON.parse(raw) : null;
  }

  async getRouteLiveLocation(routeId: string): Promise<DriverLocationPayload | null> {
    const key = redisKeys.routeLiveLocation(routeId);
    const raw = await this.redis.get(key);
    return raw ? JSON.parse(raw) : null;
  }

  async createTrackingSession(token: string, routeId: string, ttlMinutes: number): Promise<void> {
    const key = redisKeys.trackingSession(token);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000).toISOString();
    await this.redis.setex(key, ttlMinutes * 60, JSON.stringify({ routeId, expiresAt }));
  }

  async getTrackingSession(token: string): Promise<{ routeId: string; expiresAt: string } | null> {
    const key = redisKeys.trackingSession(token);
    const raw = await this.redis.get(key);
    return raw ? JSON.parse(raw) : null;
  }

  async invalidateTrackingSession(token: string): Promise<void> {
    const key = redisKeys.trackingSession(token);
    await this.redis.del(key);
  }
}
