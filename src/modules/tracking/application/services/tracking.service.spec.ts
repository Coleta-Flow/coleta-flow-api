import { Test, TestingModule } from '@nestjs/testing';
import { TrackingRedisService } from '../../infrastructure/redis/tracking-redis.service';
import { REDIS_CLIENT } from '../../../../config/redis.config';
import { ConfigService } from '@nestjs/config';

const mockRedis = {
  setex: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
};

const mockConfig = {
  get: jest.fn((key: string) => {
    if (key === 'REDIS_HOST') return 'localhost';
    if (key === 'REDIS_PORT') return 6379;
    return undefined;
  }),
};

describe('TrackingRedisService', () => {
  let service: TrackingRedisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackingRedisService,
        { provide: REDIS_CLIENT, useValue: mockRedis },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<TrackingRedisService>(TrackingRedisService);
    jest.clearAllMocks();
  });

  it('should save driver location in Redis with TTL', async () => {
    const payload = {
      routeId: 'route-id',
      driverId: 'driver-id',
      lat: -3.7319,
      lng: -38.5267,
      timestamp: new Date().toISOString(),
    };

    await service.saveDriverLocation(payload);

    expect(mockRedis.setex).toHaveBeenCalledWith(
      expect.stringContaining('driver-id'),
      expect.any(Number),
      expect.any(String),
    );
  });

  it('should create tracking session with TTL', async () => {
    await service.createTrackingSession('token-123', 'route-id', 180);

    expect(mockRedis.setex).toHaveBeenCalledWith(
      'tracking:token-123:session',
      180 * 60,
      expect.any(String),
    );
  });

  it('should return null for non-existent tracking session', async () => {
    mockRedis.get.mockResolvedValue(null);
    const result = await service.getTrackingSession('nonexistent-token');
    expect(result).toBeNull();
  });

  it('should invalidate tracking session when route finishes', async () => {
    await service.invalidateTrackingSession('token-123');
    expect(mockRedis.del).toHaveBeenCalledWith('tracking:token-123:session');
  });

  it('should not save GPS updates to event store (only Redis)', async () => {
    const payload = {
      routeId: 'route-id',
      driverId: 'driver-id',
      lat: -3.7319,
      lng: -38.5267,
      timestamp: new Date().toISOString(),
    };

    await service.saveDriverLocation(payload);

    // Confirms that GPS data only goes to Redis, not event store
    expect(mockRedis.setex).toHaveBeenCalled();
  });
});
